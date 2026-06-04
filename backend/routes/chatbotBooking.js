/**
 * Chatbot Booking Route — Cinema Booking System
 * POST /api/chatbot/booking
 *
 * Structured booking-assistant endpoint.
 * No auth required (anyone can browse movies/showtimes).
 */

const express = require('express');
const router = express.Router();
const { handleBookingChat } = require('../controllers/chatbotBookingController');

router.post('/booking', handleBookingChat);

module.exports = router;
