const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { authenticateToken, requireRole, requireSuperAdmin } = require('../middleware/authMiddleware');
const { createSuperDistributor, createDistributor, createRetailer, getHierarchy } = require('../controllers/usersController.js');

// Create Super Distributor
router.post('/super-distributor', authenticateToken, requireSuperAdmin, createSuperDistributor);

// Create Distributor
router.post('/distributor', authenticateToken, requireSuperAdmin, createDistributor);

// Create Retailer
router.post('/retailer', authenticateToken, requireSuperAdmin, createRetailer);

// get retailer
router.get('/', authenticateToken, requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']), async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => doc.data());
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

// Get users under current user
router.get('/hierarchy',
  authenticateToken,
  requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']),
  getHierarchy
);


// Get current user's wallet
router.get('/wallet',
  authenticateToken,
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