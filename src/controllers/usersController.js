const { admin, db } = require('../config/firebase');
async function createSuperDistributor(req, res) {
  try {
    const { email, name, phone, password } = req.body;
    if (!email || !name || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({ email, password, displayName: name, phoneNumber: phone });
    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      role: "super_distributor",
      parentId: req.user.uid,
      hierarchy: { superAdmin: req.user.uid },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };
    await db.collection('users').doc(userRecord.uid).set(userData);
    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createDistributor(req, res) {
  try {
    const { email, name, phone, password, superDistributorId } = req.body;
    if (!email || !name || !phone || !password || !superDistributorId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Fetch super distributor
    const superDistributorDoc = await db.collection('users').doc(superDistributorId).get();
    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super_distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({ email, password, displayName: name, phoneNumber: phone });
    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      role: "distributor",
      parentId: superDistributorId,
      hierarchy: {
        superAdmin: superDistributorDoc.data().hierarchy.superAdmin,
        superDistributor: superDistributorId
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };
    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createRetailer(req, res) {
  try {
    const { email, name, phone, password, shopName, paymentQr, superDistributorId, distributorId } = req.body;
    if (!superDistributorId || !distributorId || !email || !name || !phone || !password || !shopName || !paymentQr) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Fetch super distributor and distributor
    const superDistributorDoc = await db.collection('users').doc(superDistributorId).get();
    const distributorDoc = await db.collection('users').doc(distributorId).get();
    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super_distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }
    if (!distributorDoc.exists || distributorDoc.data().role !== 'distributor' || distributorDoc.data().parentId !== superDistributorId) {
      return res.status(400).json({ error: 'Invalid distributor' });
    }
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({ email, password, displayName: name, phoneNumber: phone });
    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      shopName,
      paymentQr,
      role: "retailer",
      parentId: distributorId,
      hierarchy: {
        superAdmin: distributorDoc.data().hierarchy.superAdmin,
        superDistributor: superDistributorId,
        distributor: distributorId
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };
    await db.collection('users').doc(userRecord.uid).set(userData);
    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getHierarchy(req, res) {
  try {
    const { role } = req.userData;
    let query = db.collection('users');

    // Determine the immediate child role
    const childRoles = {
      super_admin: 'super_distributor',
      super_distributor: 'distributor',
      distributor: 'retailer'
    };

    if (role === 'retailer') {
      // Retailers see end users
      query = db.collection('endUsers').where('retailerId', '==', req.user.uid);
    } else {
      const childRole = childRoles[role];
      query = query
        .where('role', '==', childRole)
        .where('parentId', '==', req.user.uid);
    }

    const snapshot = await query.get();
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({ uid: data.uid, name: data.name });
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getMe(req, res) {
  try {
    // req.user is set by authenticateUser middleware (contains uid)
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    // Optionally, remove sensitive fields before sending
    delete userData.password; // if you store passwords (not recommended)
    res.json({ user: userData });
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}
module.exports = {
  createSuperDistributor,
  createDistributor,
  createRetailer,
  getHierarchy,
  getMe
};