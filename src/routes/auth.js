const express = require('express');
const router = express.Router();
const { admin } = require('../config/firebase');
const { authenticateUser } = require('../middleware/authMiddleware');

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
