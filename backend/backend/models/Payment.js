/**
 * Payment Model - SQL Queries
 */

const { query } = require('../config/database');

const Payment = {
    async findAll() {
        const result = await query(
            `SELECT p.*, b.total_price, u.name AS user_name
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             JOIN users u ON b.user_id = u.id
             ORDER BY p.created_at DESC`
        );
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM payments WHERE id = $1', [id]);
        return result.rows[0];
    },

    async findByBooking(bookingId) {
        const result = await query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
        return result.rows[0];
    },

    async create({ booking_id, amount, payment_method, transaction_id }) {
        const result = await query(
            `INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status)
             VALUES ($1, $2, $3, $4, 'completed') RETURNING *`,
            [booking_id, amount, payment_method, transaction_id]
        );
        return result.rows[0];
    },

    async updateStatus(id, status) {
        const result = await query(
            'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    }
};

module.exports = Payment;
