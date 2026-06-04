const express = require('express');
const router = express.Router();
const adminStatsController = require('../controllers/adminStatsController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, adminOnly, adminStatsController.getSummary);

module.exports = router;
