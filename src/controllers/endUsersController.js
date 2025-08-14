const { admin, db } = require('../config/firebase');
const EndUser = require('../models/EndUser');
const { logKeyTransaction } = require('../utils');

async function createEndUser(req, res) {
  try {
    // 1. Validate input
    const {
      fullName,
      email,
      phoneNumber,
      deviceName,
      imei1,
      imei2,
      emi
    } = req.body;

    console.log(req.body);
    const retailerId = req.user?.uid;
    if (!retailerId) return res.status(401).json({ error: 'Unauthorized retailer' });

    if (!fullName || !email || !phoneNumber || !imei1 || !imei2 || !deviceName || !emi) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { start_date, installments_left, monthly_installment, total_amount } = emi;
    if (start_date==null || installments_left==null|| monthly_installment == null || !total_amount==null) {
      return res.status(400).json({ error: 'Missing required EMI fields' });
    }

    // 2. Validate retailer and key
    const retailerRef = db.collection('users').doc(retailerId);
    const retailerDoc = await retailerRef.get();
    if (!retailerDoc.exists) return res.status(404).json({ error: 'Retailer not found' });

    const keysSnap = await db.collection('keys')
      .where('assignedTo', '==', retailerId)
      .where('status', '==', 'credited')
      .limit(1)
      .get();

    if (keysSnap.empty) return res.status(400).json({ error: 'No available keys to provision' });

    const keyDoc = keysSnap.docs[0];
    const keyId = keyDoc.id;
    const keyRef = keyDoc.ref;
    const key = keyDoc.data();

    if (key.assignedTo !== retailerId || key.status !== 'credited') {
      return res.status(403).json({ error: 'Key is not assigned to you or already provisioned' });
    }

    // 3. Create EndUser instance
    const endUser = new EndUser({
      uid: keyId,
      fullName,
      email,
      phoneNumber,
      deviceName,
      imei1,
      imei2,
      keyId,
      retailerId,
      registeredBy: retailerId
    });

    // 4. Firestore batch: save user, provision key, update wallet
    await endUser.provisionDevice({ keyRef, retailerRef });

    // 5. Add EMI document
    await endUser.addEmi(emi);

    // 6. Log transaction (optional)
    try {
      await logKeyTransaction({
        keyIds: [keyId],
        action: 'provisioned',
        fromUser: retailerId,
        toUser: keyId,
        fromRole: 'retailer',
        toRole: 'end_user',
        participants: [retailerId, keyId],
        performedBy: retailerId,
        reason: `Provisioned to user ${fullName}`
      });
    } catch (logError) {
      console.error('Transaction log error:', logError);
    }

    res.json({ success: true, message: 'EndUser created and device provisioned', enduserId: keyId });
  } catch (error) {
    console.error('EndUser creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createEndUser
};
