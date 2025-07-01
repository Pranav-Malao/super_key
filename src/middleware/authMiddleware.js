const { admin, db } = require('../config/firebase');

const requireSuperAdmin = async (req, res, next) => {
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can perform this action' });
  }
  req.superAdmin = userDoc.data();
  next();
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log(error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

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

module.exports = { authenticateToken, requireRole, requireSuperAdmin }; 