const { admin, db } = require('../config/firebase');

class BaseUser {
  constructor({ uid, email, name, phone, role, parentId, hierarchy, createdAt, wallet, status = "active" }) {
    this.uid = uid;
    this.email = email;
    this.name = name;
    this.phone = phone;
    this.role = role;
    this.parentId = parentId;
    this.hierarchy = hierarchy;
    this.createdAt = createdAt || admin.firestore.FieldValue.serverTimestamp();
    this.wallet = wallet || {
      availableKeys: 0,
      totalKeysReceived: 0,
      totalKeysTransferred: 0,
      totalProvisioned: 0,
      totalRevoked: 0,
      activeDevices: 0
    };
    this.status = status;
  }

  toFirestore() {
    return {
      uid: this.uid,
      email: this.email,
      name: this.name,
      phone: this.phone,
      role: this.role,
      parentId: this.parentId,
      wallet: this.wallet,
      hierarchy: this.hierarchy,
      createdAt: this.createdAt,
      status: this.status
    };
  }

  async save() {
    await db.collection("users").doc(this.uid).set(this.toFirestore());
  }

  async update(fields) {
    Object.assign(this, fields);
    await db.collection("users").doc(this.uid).update(fields);
  }

  async delete() {
    await db.collection("users").doc(this.uid).delete();
  }

  static async fetch(uid) {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return UserFactory.create(data);
  }
}

// 🏢 SuperDistributorUser
class SuperDistributorUser extends BaseUser {
  constructor(data) {
    super({ ...data, role: "super_distributor" });
    // No extra fields needed
  }

  // Inherits toFirestore(), save(), update(), delete()
}

// 🏬 DistributorUser
class DistributorUser extends BaseUser {
  constructor(data) {
    super({ ...data, role: "distributor" });
    // No extra fields needed
  }

  // Inherits toFirestore(), save(), update(), delete()
}

// 🛍️ RetailerUser
class RetailerUser extends BaseUser {
  constructor(data) {
    super({ ...data, role: "retailer" });
    this.shopName = data.shopName;
    this.paymentQr = data.paymentQr;
  }

  // Override toFirestore to include retailer-specific fields
  toFirestore() {
    return {
      ...super.toFirestore(),
      shopName: this.shopName,
      paymentQr: this.paymentQr
    };
  }

  async update(fields) {
    Object.assign(this, fields);
    if ('shopName' in fields) this.shopName = fields.shopName;
    if ('paymentQr' in fields) this.paymentQr = fields.paymentQr;
    await db.collection("users").doc(this.uid).update(this.toFirestore());
  }
}

// 🏭 UserFactory
class UserFactory {
  static create(data) {
    switch (data.role) {
      case "super_distributor":
        return new SuperDistributorUser(data);
      case "distributor":
        return new DistributorUser(data);
      case "retailer":
        return new RetailerUser(data);
      default:
        return new BaseUser(data);
    }
  }
}

module.exports = {
  BaseUser,
  SuperDistributorUser,
  DistributorUser,
  RetailerUser,
  UserFactory
};
