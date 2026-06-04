/**
 * Booking Model - SQL Queries
 */

const { query, getClient } = require('../config/database');

const Booking = {
    async findAll() {
        const result = await query(
            `SELECT b.*, u.name AS user_name, u.email AS user_email,
                    m.title AS movie_title, s.show_time, t.name AS theater_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', seat.id,
                                'row_label', seat.row_label,
                                'seat_number', seat.seat_number,
                                'seat_type', seat.seat_type
                            )
                            ORDER BY seat.row_label, seat.seat_number
                        ) FILTER (WHERE seat.id IS NOT NULL),
                        '[]'
                    ) AS seats
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN shows s ON b.show_id = s.id
             JOIN movies m ON s.movie_id = m.id
             JOIN theaters t ON s.theater_id = t.id
             LEFT JOIN booking_seats bs ON bs.booking_id = b.id
             LEFT JOIN seats seat ON seat.id = bs.seat_id
             GROUP BY b.id, u.name, u.email, m.title, s.show_time, t.name
             ORDER BY b.created_at DESC`
        );
        return result.rows;
    },

    async findById(id) {
        const result = await query(
            `SELECT b.*, u.name AS user_name, u.email AS user_email,
                    m.title AS movie_title, s.show_time, t.name AS theater_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', seat.id,
                                'row_label', seat.row_label,
                                'seat_number', seat.seat_number,
                                'seat_type', seat.seat_type
                            )
                            ORDER BY seat.row_label, seat.seat_number
                        ) FILTER (WHERE seat.id IS NOT NULL),
                        '[]'
                    ) AS seats
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN shows s ON b.show_id = s.id
             JOIN movies m ON s.movie_id = m.id
             JOIN theaters t ON s.theater_id = t.id
             LEFT JOIN booking_seats bs ON bs.booking_id = b.id
             LEFT JOIN seats seat ON seat.id = bs.seat_id
             WHERE b.id = $1
             GROUP BY b.id, u.name, u.email, m.title, s.show_time, t.name`,
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

            const showResult = await client.query(
                'SELECT id, theater_id FROM shows WHERE id = $1 FOR UPDATE',
                [show_id]
            );
            const show = showResult.rows[0];
            if (!show) {
                const error = new Error('Show not found');
                error.status = 404;
                throw error;
            }

            const uniqueSeatIds = [...new Set(seat_ids.map(Number).filter(Number.isInteger))];
            if (uniqueSeatIds.length !== seat_ids.length) {
                const error = new Error('Seat IDs must be unique valid integers');
                error.status = 400;
                throw error;
            }

            const seatsResult = await client.query(
                `SELECT id FROM seats
                 WHERE theater_id = $1 AND id = ANY($2::int[])
                 FOR UPDATE`,
                [show.theater_id, uniqueSeatIds]
            );
            if (seatsResult.rowCount !== uniqueSeatIds.length) {
                const error = new Error('One or more selected seats do not belong to this show theater');
                error.status = 400;
                throw error;
            }

            const bookedResult = await client.query(
                `SELECT s.row_label, s.seat_number
                 FROM booking_seats bs
                 JOIN bookings b ON b.id = bs.booking_id
                 JOIN seats s ON s.id = bs.seat_id
                 WHERE b.show_id = $1
                   AND b.status != 'cancelled'
                   AND bs.seat_id = ANY($2::int[])`,
                [show_id, uniqueSeatIds]
            );
            if (bookedResult.rowCount > 0) {
                const labels = bookedResult.rows.map(s => `${s.row_label}${s.seat_number}`).join(', ');
                const error = new Error(`Selected seat(s) already booked: ${labels}`);
                error.status = 409;
                throw error;
            }

            // Create the booking
            const bookingResult = await client.query(
                `INSERT INTO bookings (user_id, show_id, total_price, status)
                 VALUES ($1, $2, $3, 'pending') RETURNING *`,
                [user_id, show_id, total_price]
            );
            const booking = bookingResult.rows[0];

            // Insert booking seats
            for (const seatId of uniqueSeatIds) {
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
