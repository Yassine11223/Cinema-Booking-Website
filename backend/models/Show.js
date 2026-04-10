/**
 * Show Model - SQL Queries
 */

const { query } = require('../config/database');

const Show = {
    async findAll(filters = {}) {
        let sql = `
            SELECT s.*, m.title AS movie_title, m.poster_url, t.name AS theater_name
            FROM shows s
            JOIN movies m ON s.movie_id = m.id
            JOIN theaters t ON s.theater_id = t.id
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
