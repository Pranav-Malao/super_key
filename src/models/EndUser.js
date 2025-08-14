const { admin, db } = require('../config/firebase');

class EndUser {
  constructor({
    uid,
    fullName,
    email,
    phoneNumber,
    deviceName,
    imei1,
    imei2,
    keyId,
    retailerId,
    registeredBy,
    createdAt = admin.firestore.Timestamp.now()
  }) {
    this.uid = uid;
    this.fullName = fullName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.deviceName = deviceName;
    this.imei1 = imei1;
    this.imei2 = imei2;
    this.keyId = keyId;
    this.retailerId = retailerId;
    this.registeredBy = registeredBy;
    this.createdAt = createdAt;
  }

  toFirestore() {
    return {
      fullName: this.fullName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      deviceName: this.deviceName,
      imei1: this.imei1,
      imei2: this.imei2,
      keyId: this.keyId,
      retailerId: this.retailerId,
      registeredBy: this.registeredBy,
      createdAt: this.createdAt
    };
  }

  static async fetch(uid) {
    const doc = await db.collection('endUsers').doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return new EndUser({ uid, ...data });
  }

  async save() {
    await db.collection('endUsers').doc(this.uid).set(this.toFirestore());
  }

  async addEmi(emi) {
    const startDate = new Date(emi.start_date);
    const nextInstallmentDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const emiDoc = {
      ...emi,
      start_date: admin.firestore.Timestamp.fromDate(startDate),
      next_installment_date: admin.firestore.Timestamp.fromDate(nextInstallmentDate)
    };

    await db.collection('endUsers').doc(this.uid).collection('emi').add(emiDoc);
  }

  async provisionDevice({ keyRef, retailerRef }) {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    batch.set(db.collection('endUsers').doc(this.uid), this.toFirestore());
    batch.update(keyRef, {
      status: 'provisioned',
      provisionedAt: now
    });
    batch.update(retailerRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-1),
      'wallet.totalProvisioned': admin.firestore.FieldValue.increment(1)
    });

    await batch.commit();
  }

  async getEmis() {
    const snapshot = await db.collection('endUsers').doc(this.uid).collection('emi').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getEmiTransactions() {
    const snapshot = await db.collection('endUsers').doc(this.uid).collection('emiTransactions').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = EndUser;
