const { admin } = require('../config/firebase');
const { SuperDistributorUser, DistributorUser, RetailerUser, BaseUser } = require('../models/User');

async function createSuperDistributor(req, res) {
  try {
    const { email, name, phone, password } = req.body;
    if (!email || !name || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone
    });

    const user = new SuperDistributorUser({
      uid: userRecord.uid,
      email,
      name,
      phone,
      parentId: req.user.uid,
      hierarchy: { superAdmin: req.user.uid }
    });

    await user.save();
    res.json({ success: true, user: user.toFirestore() });
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

    const superDistributorDoc = await admin.firestore().collection('users').doc(superDistributorId).get();
    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super_distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone
    });

    const user = new DistributorUser({
      uid: userRecord.uid,
      email,
      name,
      phone,
      parentId: superDistributorId,
      hierarchy: {
        superAdmin: superDistributorDoc.data().hierarchy.superAdmin,
        superDistributor: superDistributorId
      }
    });

    await user.save();
    res.json({ success: true, user: user.toFirestore() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createRetailer(req, res) {
  try {
    const { email, name, phone, password, shopName, paymentQr, superDistributorId, distributorId } = req.body;
    if (!email || !name || !phone || !password || !shopName || !paymentQr || !superDistributorId || !distributorId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const superDistributorDoc = await admin.firestore().collection('users').doc(superDistributorId).get();
    const distributorDoc = await admin.firestore().collection('users').doc(distributorId).get();

    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super_distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }

    if (!distributorDoc.exists || distributorDoc.data().role !== 'distributor' || distributorDoc.data().parentId !== superDistributorId) {
      return res.status(400).json({ error: 'Invalid distributor' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone
    });

    const user = new RetailerUser({
      uid: userRecord.uid,
      email,
      name,
      phone,
      parentId: distributorId,
      hierarchy: {
        superAdmin: distributorDoc.data().hierarchy.superAdmin,
        superDistributor: superDistributorId,
        distributor: distributorId
      },
      shopName,
      paymentQr
    });

    await user.save();
    res.json({ success: true, user: user.toFirestore() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getHierarchy(req, res) {
  try {
    const { role } = req.userData;
    let query = admin.firestore().collection('users');

    const childRoles = {
      super_admin: 'super_distributor',
      super_distributor: 'distributor',
      distributor: 'retailer'
    };

    if (role === 'retailer') {
      query = admin.firestore().collection('endUsers').where('retailerId', '==', req.user.uid);
    } else {
      const childRole = childRoles[role];
      query = query.where('role', '==', childRole).where('parentId', '==', req.user.uid);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { uid: data.uid, name: data.name };
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getMe(req, res) {
  console.log(req.user.uid)
  try {
    const user = await BaseUser.fetch(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.toFirestore();
    delete userData.password;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

// controllers/userController.js

async function getEndUsers(req, res) { //retailer will see all end users
  try {
    const retailerId = req.user.uid;

    const snapshot = await admin.firestore()
      .collection('endUsers')
      .where('retailerId', '==', retailerId)
      .get();

    const endUsers = [];

    snapshot.forEach(doc => {
      endUsers.push(doc.data());
    });

    res.json({ endUsers });
  } catch (error) {
    console.error('Error fetching end users:', error);
    res.status(500).json({ error: 'Failed to fetch end users' });
  }
}


module.exports = {
  createSuperDistributor,
  createDistributor,
  createRetailer,
  getHierarchy,
  getMe,
  getEndUsers
};
