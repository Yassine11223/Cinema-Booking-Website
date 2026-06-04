/**
 * Show Model - SQL Queries
 */

const { query } = require('../config/database');

const Show = {
    async findAll(filters = {}) {
        let sql = `
            SELECT s.*, m.title AS movie_title, m.poster_url, m.genre,
                   t.name AS theater_name, t.capacity, t.screen_type,
                   COUNT(bs.seat_id) FILTER (WHERE b.status != 'cancelled') AS booked
            FROM shows s
            JOIN movies m ON s.movie_id = m.id
            JOIN theaters t ON s.theater_id = t.id
            LEFT JOIN bookings b ON b.show_id = s.id
            LEFT JOIN booking_seats bs ON bs.booking_id = b.id
        `;
        const params = [];
        const conditions = [];

        if (filters.movieId) {
            params.push(filters.movieId);
            conditions.push(`s.movie_id = $${params.length}`);
        }

        if (filters.date) {
            params.push(filters.date);
            conditions.push(`DATE(s.show_time) = $${params.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' GROUP BY s.id, m.title, m.poster_url, m.genre, t.name, t.capacity, t.screen_type';
        sql += ' ORDER BY s.show_time ASC';
        const result = await query(sql, params);
        return result.rows;
    },

    async findById(id) {
        const result = await query(
            `SELECT s.*, m.title AS movie_title, m.duration, t.name AS theater_name, t.capacity
             FROM shows s
             JOIN movies m ON s.movie_id = m.id
             JOIN theaters t ON s.theater_id = t.id
             WHERE s.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async create({ movie_id, theater_id, show_time, price }) {
        const result = await query(
            'INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES ($1, $2, $3, $4) RETURNING *',
            [movie_id, theater_id, show_time, price]
        );
        return result.rows[0];
    },

    async update(id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const result = await query(
            `UPDATE shows SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
            [...values, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await query('DELETE FROM shows WHERE id = $1', [id]);
    }
};

module.exports = Show;
