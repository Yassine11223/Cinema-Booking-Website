/**
 * User Model - SQL Queries
 */

const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
    async findAll() {
        const result = await query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
        return result.rows;
    },

    async findById(id) {
        const result = await query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [id]);
        return result.rows[0];
    },

    async findByEmail(email) {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },

    async create({ name, email, password, phone, role = 'customer' }) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await query(
            'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role, created_at',
            [name, email, hashedPassword, phone, role]
        );
        return result.rows[0];
    },

    async update(id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const result = await query(
            `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING id, name, email, phone, role`,
            [...values, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await query('DELETE FROM users WHERE id = $1', [id]);
    },

    async comparePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
};

module.exports = User;
