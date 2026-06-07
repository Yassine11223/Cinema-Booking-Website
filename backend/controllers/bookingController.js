/**
 * Booking Controller - Handles booking operations
 */

const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { sendTicketEmail } = require('../utils/emailService');
const { COMING_SOON_BOOKING_MESSAGE, isComingSoonRelease } = require('../utils/movieAvailability');

async function sendBookingConfirmationEmail(bookingId) {
    const populatedBooking = await Booking.findByIdPopulated(bookingId);
    if (!populatedBooking) return null;

    const seats = await Booking.getBookingSeats(bookingId);
    populatedBooking.seats = seats;
    return sendTicketEmail(populatedBooking, populatedBooking.user_id);
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

            // Get the populated show so movie release_date is available for booking validation.
            const show = await Show.findByIdPopulated(show_id);
            if (!show) {
                return res.status(404).json({ message: 'Show not found' });
            }

            if (isComingSoonRelease(show.release_date)) {
                return res.status(403).json({ message: COMING_SOON_BOOKING_MESSAGE });
            }

            const conflicts = await Booking.findActiveSeatConflicts(show_id, seat_ids);
            if (conflicts.length > 0) {
                const bookedSeatIds = [
                    ...new Set(conflicts.flatMap((booking) => (
                        booking.seats || []
                    ).map((seatId) => seatId.toString()))),
                ].filter((seatId) => seat_ids.map(String).includes(seatId));

                return res.status(409).json({
                    message: 'Selected seats are already booked.',
                    bookedSeatIds,
                });
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
            console.error('[BookingController] Failed to create booking:', {
                message: error.message,
                show_id: req.body?.show_id,
                seat_ids: req.body?.seat_ids,
                user_id: req.user?.id,
            });
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
            let ticketData = null;
            try {
                ticketData = await sendBookingConfirmationEmail(req.params.id);
            } catch (emailError) {
                console.error('[BookingController] Failed to send email during confirmation:', emailError);
            }

            res.json({
                message: 'Booking confirmed',
                booking,
                ticketData: ticketData ? {
                    bookingId: ticketData.bookingId,
                    purchaseTimestamp: ticketData.purchaseTimestamp,
                    tickets: ticketData.tickets,
                    emailSentTo: ticketData.recipient,
                    emailSent: ticketData.emailSent,
                    messageId: ticketData.messageId,
                    emailError: ticketData.error,
                } : null,
            });
        } catch (error) {
            next(error);
        }
    },
};

bookingController.sendBookingConfirmationEmail = sendBookingConfirmationEmail;

module.exports = bookingController;
