/**
 * Booking Model - SQL Queries
 */

const { query, getClient } = require('../config/database');

const Booking = {
    async findAll() {
        const result = await query(
            `SELECT b.*, u.name AS user_name, u.email AS user_email,
                    m.title AS movie_title, s.show_time, t.name AS theater_name
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN shows s ON b.show_id = s.id
             JOIN movies m ON s.movie_id = m.id
             JOIN theaters t ON s.theater_id = t.id
             ORDER BY b.created_at DESC`
        );
        return result.rows;
    },

    async findById(id) {
        const result = await query(
            `SELECT b.*, u.name AS user_name, u.email AS user_email,
                    m.title AS movie_title, s.show_time, t.name AS theater_name
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN shows s ON b.show_id = s.id
             JOIN movies m ON s.movie_id = m.id
             JOIN theaters t ON s.theater_id = t.id
             WHERE b.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async findByUser(userId) {
        const result = await query(
            `SELECT b.*, m.title AS movie_title, m.poster_url,
                    s.show_time, t.name AS theater_name
             FROM bookings b
             JOIN shows s ON b.show_id = s.id
             JOIN movies m ON s.movie_id = m.id
             JOIN theaters t ON s.theater_id = t.id
             WHERE b.user_id = $1
             ORDER BY b.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    /**
     * Create a booking with seats (uses a transaction)
     */
    async create({ user_id, show_id, seat_ids, total_price }) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Create the booking
            const bookingResult = await client.query(
                `INSERT INTO bookings (user_id, show_id, total_price, status)
                 VALUES ($1, $2, $3, 'pending') RETURNING *`,
                [user_id, show_id, total_price]
            );
            const booking = bookingResult.rows[0];

            // Insert booking seats
            for (const seatId of seat_ids) {
                await client.query(
                    'INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)',
                    [booking.id, seatId]
                );
            }

            await client.query('COMMIT');
            return booking;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async updateStatus(id, status) {
        const result = await query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    },

    async getBookingSeats(bookingId) {
        const result = await query(
            `SELECT s.row_label, s.seat_number, s.seat_type
             FROM booking_seats bs
             JOIN seats s ON bs.seat_id = s.id
             WHERE bs.booking_id = $1
             ORDER BY s.row_label, s.seat_number`,
            [bookingId]
        );
        return result.rows;
    },

    async delete(id) {
        await query('DELETE FROM bookings WHERE id = $1', [id]);
    }
};

module.exports = Booking;
