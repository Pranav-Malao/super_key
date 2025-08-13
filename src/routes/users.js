const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireRole, authenticateUser } = require('../middleware/authMiddleware');
const { createSuperDistributor, createDistributor, createRetailer, getHierarchy, getMe, getEndUsers } = require('../controllers/usersController.js');

// Create Super Distributor
router.post('/super-distributor', authenticateUser, requireRole(['super_admin']), createSuperDistributor);

// Create Distributor
router.post('/distributor', authenticateUser, requireRole(['super_admin']), createDistributor);

// Create Retailer
router.post('/retailer', authenticateUser, requireRole(['super_admin']), createRetailer);

// GET /api/users/me
router.get('/me', authenticateUser, getMe);

// Get users under current user
router.get('/hierarchy',
  authenticateUser,
  requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']),
  getHierarchy
);

// get end users by retailer
router.get('/end-users', authenticateUser, requireRole(['retailer']), getEndUsers);

// Get current user's wallet
router.get('/wallet',
  authenticateUser,
  requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']),
  async (req, res) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const wallet = userDoc.data().wallet;

      res.json({ wallet });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router; 