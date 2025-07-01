const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');

// // REGISTER: Create user profile in Firestore after Firebase Auth registration
// router.post('/register', async (req, res) => {
//   try {
//     const { idToken, name, phone, role } = req.body;
//     if (!idToken || !name || !phone || !role) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     // Verify Firebase ID token
//     const decoded = await admin.auth().verifyIdToken(idToken);
//     const { uid, email } = decoded;

//     // Check if user already exists
//     const userDoc = await db.collection('users').doc(uid).get();
//     if (userDoc.exists) {
//       return res.status(400).json({ error: 'User already exists' });
//     }

//     // Create user profile in Firestore
//     const userData = {
//       uid,
//       email,
//       name,
//       phone,
//       role,
//       createdAt: new Date(),
//       status: 'active'
//     };
//     await db.collection('users').doc(uid).set(userData);

//     res.json({ success: true, message: 'User registered', user: userData });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// LOGIN: Fetch user profile after Firebase Auth login
router.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken' });
    }

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid } = decoded;
    // Fetch user profile from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ success: true, user: userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
