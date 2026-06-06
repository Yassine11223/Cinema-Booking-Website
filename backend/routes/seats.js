/**
 * Seat Routes
 */

const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');

router.get('/available', seatController.getAvailableByShow);

module.exports = router;
