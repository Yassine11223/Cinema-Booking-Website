/**
 * Booking Controller - Handles booking operations
 */

const Booking = require('../models/Booking');
const Show = require('../models/Show');

const bookingController = {
    // GET /api/bookings (admin)
    async getAll(req, res, next) {
        try {
            const bookings = await Booking.findAll();
            res.json(bookings);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/bookings/:id
    async getById(req, res, next) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            const seats = await Booking.getBookingSeats(booking.id);
            res.json({ ...booking, seats });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/bookings/my (authenticated user)
    async getMyBookings(req, res, next) {
        try {
            const bookings = await Booking.findByUser(req.user.id);
            res.json(bookings);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/bookings
    async create(req, res, next) {
        try {
            const { show_id, seat_ids } = req.body;

            // Get show to calculate price
            const show = await Show.findById(show_id);
            if (!show) {
                return res.status(404).json({ message: 'Show not found' });
            }

            const total_price = parseFloat(show.price) * seat_ids.length;

            const booking = await Booking.create({
                user_id: req.user.id,
                show_id,
                seat_ids,
                total_price,
            });

            res.status(201).json(booking);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/bookings/:id/cancel
    async cancel(req, res, next) {
        try {
            const booking = await Booking.updateStatus(req.params.id, 'cancelled');
            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }
            res.json({ message: 'Booking cancelled', booking });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = bookingController;
