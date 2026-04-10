/**
 * Theater Model - SQL Queries
 */

const { query } = require('../config/database');

const Theater = {
    async findAll() {
        const result = await query('SELECT * FROM theaters ORDER BY name ASC');
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT * FROM theaters WHERE id = $1', [id]);
        return result.rows[0];
    },

    async create({ name, capacity, screen_type }) {
        const result = await query(
            'INSERT INTO theaters (name, capacity, screen_type) VALUES ($1, $2, $3) RETURNING *',
            [name, capacity, screen_type]
        );
        return result.rows[0];
    },

    async update(id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const result = await query(
            `UPDATE theaters SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
            [...values, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await query('DELETE FROM theaters WHERE id = $1', [id]);
    }
};

module.exports = Theater;
