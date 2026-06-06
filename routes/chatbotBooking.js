/**
 * Chatbot Booking Route - Cinema Booking System
 * POST /api/chatbot/booking
 */

const express = require('express');
const router = express.Router();
const { handleBookingChat } = require('../controllers/chatbotBookingController');

router.post('/booking', handleBookingChat);

module.exports = router;
