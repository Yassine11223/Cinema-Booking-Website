/**
 * Ticket Routes — QR Code Ticket Generation
 * 
 * POST /api/tickets/generate — Generate QR-coded tickets for a booking
 * 
 * NOTE: This endpoint is intentionally NOT behind the `authenticate` middleware.
 * The existing frontend payment flow is simulated (no real backend payment call),
 * so requiring JWT auth here would break the current flow.
 * 
 * FUTURE: When full backend payment integration is complete, add authenticate:
 *   router.post('/generate', authenticate, ticketController.generateTickets);
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
// const { authenticate } = require('../middleware/auth'); // FUTURE: Uncomment for auth

router.post('/generate', ticketController.generateTickets);

module.exports = router;
