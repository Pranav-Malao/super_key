const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { authenticateUser } = require('../middleware/authMiddleware');

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
// router.post('/login', async (req, res) => {
//   try {
//     const { idToken } = req.body;
//     if (!idToken) {
//       return res.status(400).json({ error: 'Missing idToken' });
//     }

//     // Verify Firebase ID token
//     const decoded = await admin.auth().verifyIdToken(idToken);
//     const { uid } = decoded;
//     // Fetch user profile from Firestore
//     const userDoc = await db.collection('users').doc(uid).get();
//     if (!userDoc.exists) {
//       return res.status(404).json({ error: 'User profile not found' });
//     }

//     res.json({ success: true, user: userDoc.data() });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// 👇 Session login: exchanges ID token for a session cookie
router.post('/sessionLogin', async (req, res) => {
  const { idToken } = req.body;
  const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
  const isProduction = process.env.NODE_ENV == 'production';
  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    res.cookie('session', sessionCookie, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: expiresIn
    });

    res.json({ success: true, message: 'Session established'});
  } catch (err) {
    res.status(401).json({ error: 'Invalid ID token' });
  }
});

// 👇 Logout route: clears session cookie
router.post('/logout', async (req, res) => {
  const sessionCookie = req.cookies.session || '';
  const isProduction = process.env.NODE_ENV == 'production';

  // Clear the cookie (options must match those used when setting it)
  res.clearCookie('session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });

  // Optionally revoke the session on Firebase (recommended for security)
  try {
    if (sessionCookie) {
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
      await admin.auth().revokeRefreshTokens(decodedClaims.sub);
    }
  } catch (e) {
    console.log("error in logout", e.message);
  }

  res.json({ success: true, message: 'Logged out' });
});

module.exports = { router, authenticateUser };
