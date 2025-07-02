const { admin, db } = require('../config/firebase');

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const { db } = require('../config/firebase');
      const userDoc = await db.collection('users').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      if (!roles.includes(userData.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userData = userData;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

const authenticateUser = async (req, res, next) => {
  try {
    let decoded;

    // Check for session cookie (web)
    if (req.cookies?.session) {
      decoded = await admin.auth().verifySessionCookie(req.cookies.session, true);
    }
    // Check for Bearer token (mobile)
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      const idToken = req.headers.authorization.split('Bearer ')[1];
      decoded = await admin.auth().verifyIdToken(idToken);
    } else {
      return res.status(401).json({ error: 'Unauthorized request' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token/cookie' });
  }
};

module.exports = { requireRole, authenticateUser }; 