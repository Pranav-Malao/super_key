const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { authenticateToken, requireSuperAdmin } = require('../middleware/authMiddleware');

const { createKeys, transferKeys, revokeKeys } = require('../controllers/keysController');


// 1. Generate Keys (Super Admin only)
router.post('/generate', authenticateToken, requireSuperAdmin, createKeys);


// 2. Transfer Keys Down the Hierarchy
router.post('/transfer', authenticateToken, transferKeys);


// 3. Provision Key (Retailer only)
router.post('/provision', authenticateToken, async (req, res) => {
  try {
    const { keyId, keyCode, provisionedAt } = req.body;
    if (!keyId || !keyCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get retailer info
    const retailerDoc = await db.collection('users').doc(req.user.uid).get();
    if (!retailerDoc.exists || retailerDoc.data().role !== "retailer") {
      return res.status(403).json({ error: 'Only retailers can provision keys' });
    }

    // Get key
    const keyRef = db.collection('keys').doc(keyId);
    const keyDoc = await keyRef.get();
    if (!keyDoc.exists) return res.status(404).json({ error: 'Key not found' });
    const key = keyDoc.data();

    // Only allow if key is assigned to this retailer and not already provisioned/revoked
    if (key.assignedTo !== req.user.uid || key.status === "provisioned" || key.isRevoked) {
      return res.status(400).json({ error: 'Key cannot be provisioned' });
    }

    await keyRef.update({
      keyCode,
      provisionedAt: provisionedAt ? new Date(provisionedAt) : new Date(),
      status: "provisioned",
      unlockCodes: generateUnlockCodes()
    });

    res.json({ success: true, message: "Key provisioned" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Revoke Key (Super Admin only, not provisioned)
router.post('/revoke', authenticateToken, requireSuperAdmin, revokeKeys);


// 5. Extend Key Validity (Retailer or Admin)
// Extend Validity by X Months (Retailer or Super Admin)
router.post('/extend-validity', authenticateToken, async (req, res) => {
  try {
    const { keyId, months } = req.body;
    if (!keyId || !months || months <= 0) {
      return res.status(400).json({ error: 'Missing or invalid keyId/months' });
    }

    // Get user info
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const user = userDoc.data();

    // Get key
    const keyRef = db.collection('keys').doc(keyId);
    const keyDoc = await keyRef.get();
    if (!keyDoc.exists) return res.status(404).json({ error: 'Key not found' });
    const key = keyDoc.data();

    // Authorization: must be Super Admin or the assigned owner (typically a retailer)
    const isOwner = key.assignedTo === req.user.uid;
    const isSuperAdmin = user.role === "super_admin";
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not authorized to extend validity' });
    }

    // Determine base date to extend from (validUntil or now)
    const baseDate = key.validUntil ? new Date(key.validUntil) : new Date();
    const newValidUntil = new Date(baseDate.setMonth(baseDate.getMonth() + months));

    await keyRef.update({
      validUntil: new ValidUntil
    });

    res.json({
      success: true,
      message: `Key validity extended by ${months} month(s)`,
      newValidUntil
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get Keys Assigned to Current User
router.get('/my-keys', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('keys')
      .where('assignedTo', '==', req.user.uid)
      .get();

    const keys = [];
    snapshot.forEach(doc => {
      keys.push({ id: doc.id, ...doc.data() });
    });

    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
