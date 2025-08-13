const { admin, db } = require('../config/firebase');
const Key = require('../models/Key');
const { logKeyTransaction, generateUnlockCodes } = require('../utils');

// 🔑 Create Keys
async function createKeys(req, res) {
  try {
    const { count = 1, validityInMonths } = req.body;

    if (!Number.isInteger(count) || count <= 0 || count > 100) {
      return res.status(400).json({ error: 'Invalid count' });
    }
    if (validityInMonths < 0) {
      return res.status(400).json({ error: 'Invalid validity' });
    }

    const now = admin.firestore.Timestamp.now();
    let validUntil = null;
    if (validityInMonths) {
      const nowDate = new Date();
      nowDate.setMonth(nowDate.getMonth() + validityInMonths);
      validUntil = admin.firestore.Timestamp.fromDate(nowDate);
    }

    const unlockCodes = generateUnlockCodes(12);
    const batch = db.batch();
    const createdKeyIds = [];

    for (let i = 0; i < count; i++) {
      const keyRef = db.collection('keys').doc();
      const key = new Key({
        id: keyRef.id,
        createdBy: req.user.uid,
        assignedTo: req.user.uid,
        assignedRole: 'super_admin',
        unlockCodes,
        createdAt: now,
        validUntil
      });

      batch.set(keyRef, key.toFirestore());
      createdKeyIds.push(keyRef.id);
    }

    const adminRef = db.collection('users').doc(req.user.uid);
    batch.set(adminRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(count),
        totalKeysReceived: admin.firestore.FieldValue.increment(count)
      }
    }, { merge: true });

    await batch.commit();

    await logKeyTransaction({
      keyIds: createdKeyIds,
      action: 'created',
      fromUser: null,
      toUser: req.user.uid,
      participants: [req.user.uid],
      fromRole: null,
      toRole: 'super_admin',
      performedBy: req.user.uid,
      reason: `Created ${count} keys`
    });

    res.json({ success: true, message: `${count} key(s) created`, keyIds: createdKeyIds });
  } catch (error) {
    console.error('Key creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

// 🔄 Transfer Keys
async function transferKeys(req, res) {
  try {
    const { toUserId, count } = req.body;
    const fromUserId = req.user.uid;

    if (!toUserId || !Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ error: 'Invalid toUserId or count' });
    }

    const fromUserDoc = await db.collection('users').doc(fromUserId).get();
    const toUserDoc = await db.collection('users').doc(toUserId).get();
    if (!fromUserDoc.exists || !toUserDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fromRole = fromUserDoc.data().role;
    const toRole = toUserDoc.data().role;

    const validTransfers = {
      super_admin: ['super_distributor'],
      super_distributor: ['distributor'],
      distributor: ['retailer']
    };

    if (!validTransfers[fromRole]?.includes(toRole)) {
      return res.status(403).json({ error: 'Unauthorized role transfer' });
    }

    const allowedStatus = fromRole === 'super_admin' ? ['unassigned'] : ['credited'];
    const keys = await Key.fetchAvailableForUser(fromUserId, allowedStatus, count);

    if (keys.length < count) {
      return res.status(400).json({ error: `Only ${keys.length} transferable key(s) found` });
    }

    const batch = db.batch();
    const keyIds = [];
    const now = admin.firestore.Timestamp.now();

    for (const key of keys) {
      const keyRef = db.collection('keys').doc(key.id);
      const update = {
        assignedTo: toUserId,
        assignedRole: toRole,
        transferredFrom: fromUserId,
        transferredAt: now,
        status: 'credited'
      };

      if (fromRole === 'super_admin') update.superDistributor = toUserId;
      if (fromRole === 'super_distributor') update.distributor = toUserId;
      if (fromRole === 'distributor') update.retailer = toUserId;

      batch.update(keyRef, update);
      keyIds.push(key.id);
    }

    const fromUserRef = db.collection('users').doc(fromUserId);
    const toUserRef = db.collection('users').doc(toUserId);

    batch.update(fromUserRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-keyIds.length),
      'wallet.totalKeysTransferred': admin.firestore.FieldValue.increment(keyIds.length)
    });

    batch.set(toUserRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(keyIds.length),
        totalKeysReceived: admin.firestore.FieldValue.increment(keyIds.length)
      }
    }, { merge: true });

    await batch.commit();

    await logKeyTransaction({
      keyIds,
      fromUser: fromUserId,
      toUser: toUserId,
      participants: [fromUserId, toUserId],
      fromRole,
      toRole,
      performedBy: fromUserId,
      action: 'credited',
      reason: `Transferred ${keyIds.length} key(s)`
    });

    res.json({ success: true, message: `Transferred ${keyIds.length} keys`, keyIds });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  }
}

// 🚫 Revoke Keys
async function revokeKeys(req, res) {
  try {
    const { userId, count, reason = '' } = req.body;

    if (!userId || !Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ error: 'Invalid userId or count' });
    }

    const keys = await Key.fetchAvailableForUser(userId, ['credited'], count);
    if (keys.length === 0) {
      return res.status(404).json({ error: 'No eligible keys found for revocation' });
    }

    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    const keyIds = [];

    for (const key of keys) {
      const keyRef = db.collection('keys').doc(key.id);
      batch.update(keyRef, {
        assignedTo: null,
        assignedRole: null,
        status: 'revoked',
        revokedAt: now
      });
      keyIds.push(key.id);
    }

    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-keyIds.length),
      'wallet.totalRevoked': admin.firestore.FieldValue.increment(keyIds.length)
    });

    await batch.commit();

    await logKeyTransaction({
      keyIds,
      fromUser: userId,
      toUser: null,
      action: 'revoked',
      performedBy: req.user.uid,
      fromRole: 'super_admin',
      toRole: null,
      participants: [userId],
      reason: reason || `Revoked by Super Admin`
    });

    res.json({ success: true, message: `Revoked ${keyIds.length} key(s)`, keyIds });
  } catch (error) {
    console.error('Revocation error:', error);
    res.status(500).json({ error: error.message });
  }
}

// 📜 Get Key Transactions
async function getKeyTransactions(req, res) {
  const uid = req.user.uid;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const cursor = req.query.cursor ? Number(req.query.cursor) : null;

  try {
    let query = db.collection('keyTransactions')
      .where('participants', 'array-contains', uid)
      .orderBy('timestamp', 'desc')
      .limit(pageSize);

    if (cursor) {
      query = query.startAfter(admin.firestore.Timestamp.fromMillis(cursor));
    }

    const snap = await query.get();

    const transactions = snap.docs.map(doc => {
      const data = doc.data();
      const { keyIds, participants, performedBy, ...rest } = data;
      return { id: doc.id, ...rest };
    });

    const hasMore = snap.size === pageSize;
    const nextCursor = hasMore ? snap.docs[snap.docs.length - 1].data().timestamp.toMillis() : null;

    res.json({ transactions, nextCursor, hasMore });
  } catch (err) {
    console.error('Error fetching key transactions:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
}

module.exports = {
  createKeys,
  transferKeys,
  revokeKeys,
  getKeyTransactions
};
