/**
 * Booking Controller - Handles booking operations
 */

const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { sendTicketEmail } = require('../utils/emailService');

function canManageBooking(req, booking) {
    const bookingUserId = booking.user_id?._id || booking.user_id;
    return (
        String(bookingUserId) === String(req.user.id) ||
        req.user.role === 'admin' ||
        req.user.role === 'superadmin'
    );
}

async function sendBookingConfirmationEmail(bookingId) {
    const populatedBooking = await Booking.findByIdPopulated(bookingId);
    if (!populatedBooking) return;

    const seats = await Booking.getBookingSeats(bookingId);
    populatedBooking.seats = seats;
    await sendTicketEmail(populatedBooking, populatedBooking.user_id);
}

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
            const booking = await Booking.findByIdPopulated(req.params.id);
            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }
            if (!canManageBooking(req, booking)) {
                return res.status(403).json({ message: 'Access denied for this booking' });
            }

            const seats = await Booking.getBookingSeats(booking._id);
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

            const booking = await Booking.createBooking({
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
            const existing = await Booking.findByIdPopulated(req.params.id);
            if (!existing) {
                return res.status(404).json({ message: 'Booking not found' });
            }
            if (!canManageBooking(req, existing)) {
                return res.status(403).json({ message: 'Access denied for this booking' });
            }
            const booking = await Booking.updateStatus(req.params.id, 'cancelled');
            res.json({ message: 'Booking cancelled', booking });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/bookings/:id/confirm
    async confirm(req, res, next) {
        try {
            const existing = await Booking.findByIdPopulated(req.params.id);
            if (!existing) {
                return res.status(404).json({ message: 'Booking not found' });
            }
            if (!canManageBooking(req, existing)) {
                return res.status(403).json({ message: 'Access denied for this booking' });
            }
            const booking = await Booking.updateStatus(req.params.id, 'confirmed');

            // Send ticket confirmation email
            try {
                await sendBookingConfirmationEmail(req.params.id);
            } catch (emailError) {
                console.error('[BookingController] Failed to send email during confirmation:', emailError);
            }

            res.json({ message: 'Booking confirmed', booking });
        } catch (error) {
            next(error);
        }
    },
};

bookingController.sendBookingConfirmationEmail = sendBookingConfirmationEmail;

module.exports = bookingController;
