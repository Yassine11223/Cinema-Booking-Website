/**
 * Payment Controller - Handles payment operations
 */

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

const paymentController = {
    // GET /api/payments (admin)
    async getAll(req, res, next) {
        try {
            const payments = await Payment.findAll();
            res.json(payments);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/payments/:id
    async getById(req, res, next) {
        try {
            const payment = await Payment.findById(req.params.id);
            if (!payment) {
                return res.status(404).json({ message: 'Payment not found' });
            }
            res.json(payment);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/payments
    async create(req, res, next) {
        try {
            const { booking_id, payment_method, transaction_id } = req.body;

            // Get booking to verify and get amount
            const booking = await Booking.findById(booking_id);
            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            if (booking.status === 'cancelled') {
                return res.status(400).json({ message: 'Cannot pay for a cancelled booking' });
            }

            const payment = await Payment.create({
                booking_id,
                amount: booking.total_price,
                payment_method,
                transaction_id,
            });

            // Update booking status to confirmed
            await Booking.updateStatus(booking_id, 'confirmed');

            res.status(201).json(payment);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = paymentController;
