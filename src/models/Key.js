const { admin, db } = require('../config/firebase');

class Key {
  constructor({
    id,
    createdBy,
    assignedTo,
    assignedRole,
    superDistributor = null,
    distributor = null,
    retailer = null,
    keyCode = null,
    unlockCodes = [],
    provisionedAt = null,
    revokedAt = null,
    transferredFrom = null,
    transferredAt = null,
    createdAt = admin.firestore.Timestamp.now(),
    validUntil = null,
    status = 'unassigned'
  }) {
    this.id = id;
    this.createdBy = createdBy;
    this.assignedTo = assignedTo;
    this.assignedRole = assignedRole;
    this.superDistributor = superDistributor;
    this.distributor = distributor;
    this.retailer = retailer;
    this.keyCode = keyCode;
    this.unlockCodes = unlockCodes;
    this.provisionedAt = provisionedAt;
    this.revokedAt = revokedAt;
    this.transferredFrom = transferredFrom;
    this.transferredAt = transferredAt;
    this.createdAt = createdAt;
    this.validUntil = validUntil;
    this.status = status;
  }

  toFirestore() {
    return {
      createdBy: this.createdBy,
      assignedTo: this.assignedTo,
      assignedRole: this.assignedRole,
      superDistributor: this.superDistributor,
      distributor: this.distributor,
      retailer: this.retailer,
      keyCode: this.keyCode,
      unlockCodes: this.unlockCodes,
      provisionedAt: this.provisionedAt,
      revokedAt: this.revokedAt,
      transferredFrom: this.transferredFrom,
      transferredAt: this.transferredAt,
      createdAt: this.createdAt,
      validUntil: this.validUntil,
      status: this.status
    };
  }

  async save() {
    const ref = db.collection('keys').doc(this.id);
    await ref.set(this.toFirestore());
  }

  async update(fields) {
    Object.assign(this, fields);
    await db.collection('keys').doc(this.id).update(fields);
  }

  async revoke(byUserId) {
    const now = admin.firestore.Timestamp.now();
    await db.collection('keys').doc(this.id).update({
      assignedTo: null,
      assignedRole: null,
      status: 'revoked',
      revokedAt: now
    });

    await db.collection('users').doc(this.assignedTo).update({
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-1),
      'wallet.totalRevoked': admin.firestore.FieldValue.increment(1)
    });

    return now;
  }

  async transfer(toUserId, toRole, fromUserId) {
    const now = admin.firestore.Timestamp.now();
    const update = {
      assignedTo: toUserId,
      assignedRole: toRole,
      transferredFrom: fromUserId,
      transferredAt: now,
      status: 'credited'
    };

    // Role trail
    if (toRole === 'super_distributor') update.superDistributor = toUserId;
    if (toRole === 'distributor') update.distributor = toUserId;
    if (toRole === 'retailer') update.retailer = toUserId;

    await db.collection('keys').doc(this.id).update(update);
    return now;
  }

  static async fetch(id) {
    const doc = await db.collection('keys').doc(id).get();
    if (!doc.exists) return null;
    return new Key({ id, ...doc.data() });
  }

  static async fetchAvailableForUser(userId, statusList = ['credited'], limit = 1) {
    const snap = await db.collection('keys')
      .where('assignedTo', '==', userId)
      .where('status', 'in', statusList)
      .limit(limit)
      .get();

    return snap.docs.map(doc => new Key({ id: doc.id, ...doc.data() }));
  }
}

module.exports = Key;
