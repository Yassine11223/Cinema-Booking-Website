/**
 * Booking Controller - Handles booking operations
 */

const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const { sendTicketEmail } = require('../utils/emailService');

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
            const uniqueSeatIds = [...new Set(seat_ids.map((id) => id.toString()))];

            if (uniqueSeatIds.length !== seat_ids.length) {
                return res.status(400).json({
                    message: 'Duplicate seats are not allowed in one booking.',
                });
            }

            // Get show to calculate price
            const show = await Show.findById(show_id);
            if (!show) {
                return res.status(404).json({ message: 'Show not found' });
            }

            const seats = await Seat.find({
                _id: { $in: uniqueSeatIds },
                theater_id: show.theater_id,
            }).select('_id row_label seat_number');

            if (seats.length !== uniqueSeatIds.length) {
                return res.status(400).json({
                    message: 'One or more selected seats are invalid for this show.',
                });
            }

            const existingBooking = await Booking.findOne({
                show_id,
                active: true,
                seats: { $in: uniqueSeatIds },
            }).populate('seats', 'row_label seat_number');

            if (existingBooking) {
                const blockedSeatLabels = existingBooking.seats
                    .filter((seat) => uniqueSeatIds.includes(seat._id.toString()))
                    .map((seat) => `${seat.row_label}${seat.seat_number}`);

                return res.status(409).json({
                    message: 'One or more selected seats are no longer available.',
                    seats: blockedSeatLabels,
                });
            }

            const total_price = parseFloat(show.price) * uniqueSeatIds.length;

            const booking = await Booking.createBooking({
                user_id: req.user.id,
                show_id,
                seat_ids: uniqueSeatIds,
                total_price,
            });

            res.status(201).json(booking);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: 'One or more selected seats are no longer available.',
                });
            }
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

    // PUT /api/bookings/:id/confirm
    async confirm(req, res, next) {
        try {
            const booking = await Booking.updateStatus(req.params.id, 'confirmed');
            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }

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
