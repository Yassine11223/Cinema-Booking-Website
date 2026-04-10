/**
 * Movie Model - SQL Queries
 */

const { query } = require('../config/database');

const Movie = {
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM movies';
        const params = [];
        const conditions = [];

        if (filters.status) {
            params.push(filters.status);
            conditions.push(`status = $${params.length}`);
        }

        if (filters.genre) {
            params.push(filters.genre);
            conditions.push(`genre = $${params.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY release_date DESC';
        const result = await query(sql, params);
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM movies WHERE id = $1', [id]);
        return result.rows[0];
    },

    async create({ title, description, genre, duration, rating, release_date, poster_url, trailer_url, status }) {
        const result = await query(
            `INSERT INTO movies (title, description, genre, duration, rating, release_date, poster_url, trailer_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, description, genre, duration, rating, release_date, poster_url, trailer_url, status]
        );
        return result.rows[0];
    },

    async update(id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const result = await query(
            `UPDATE movies SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
            [...values, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await query('DELETE FROM movies WHERE id = $1', [id]);
    }
};

module.exports = Movie;
