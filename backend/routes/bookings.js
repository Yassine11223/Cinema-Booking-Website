/**
 * Booking Routes
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validation');

router.get('/my', authenticate, bookingController.getMyBookings);
router.get('/:id', authenticate, bookingController.getById);
router.get('/', authenticate, adminOnly, bookingController.getAll);
router.post('/', authenticate, validateBooking, bookingController.create);
router.put('/:id/cancel', authenticate, bookingController.cancel);

module.exports = router;
