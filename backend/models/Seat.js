/**
 * Seat Model - SQL Queries
 */

const { query } = require('../config/database');

const Seat = {
    async findByTheater(theaterId) {
        const result = await query(
            'SELECT * FROM seats WHERE theater_id = $1 ORDER BY row_label, seat_number',
            [theaterId]
        );
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM seats WHERE id = $1', [id]);
        return result.rows[0];
    },

    async findAvailableByShow(showId) {
        const result = await query(
            `SELECT s.* FROM seats s
             JOIN shows sh ON sh.theater_id = s.theater_id
             WHERE sh.id = $1
             AND s.id NOT IN (
                SELECT seat_id FROM booking_seats bs
                JOIN bookings b ON b.id = bs.booking_id
                WHERE b.show_id = $1 AND b.status != 'cancelled'
             )
             ORDER BY s.row_label, s.seat_number`,
            [showId]
        );
        return result.rows;
    },

    async createBulk(theaterId, seats) {
        const values = seats.map((seat, i) => {
            const offset = i * 4;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
        }).join(', ');

        const params = seats.flatMap(seat => [theaterId, seat.row_label, seat.seat_number, seat.seat_type || 'standard']);

        const result = await query(
            `INSERT INTO seats (theater_id, row_label, seat_number, seat_type) VALUES ${values} RETURNING *`,
            params
        );
        return result.rows;
    },

    async delete(id) {
        await query('DELETE FROM seats WHERE id = $1', [id]);
    }
};

module.exports = Seat;
