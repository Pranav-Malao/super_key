const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/authMiddleware');
const { fetchTutorials, uploadTutorial } = require('../controllers/supportController');

router.post('/tutorials/upload', authenticateToken, requireSuperAdmin, uploadTutorial);

router.get('/tutorials/all', fetchTutorials);

module.exports = router;