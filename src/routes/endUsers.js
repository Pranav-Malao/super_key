const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { createEndUser } = require('../controllers/endUsersController');

router.post('/create', authenticateToken, requireRole(['retailer']), createEndUser);

module.exports = router;