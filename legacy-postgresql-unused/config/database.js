/**
 * Database Configuration - PostgreSQL Connection
 * Uses the 'pg' package to connect to PostgreSQL.
 */

const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cinema_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    const normalized = normalizeDbError(err);
    console.error('Unexpected database pool error:', normalized.message);
});

function normalizeDbError(error) {
    if (!error) return error;

    if (error.code === 'ECONNREFUSED' || !error.message) {
        error.message =
            `PostgreSQL connection refused at ${dbConfig.host}:${dbConfig.port} ` +
            `for database "${dbConfig.database}". Verify PostgreSQL is running ` +
            'and .env DB_* values are correct.';
    }

    return error;
}

/**
 * Execute a SQL query.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    let result;

    try {
        result = await pool.query(text, params);
    } catch (error) {
        throw normalizeDbError(error);
    }

    const duration = Date.now() - start;
    if (duration > 500) {
        console.warn(`Slow query (${duration}ms):`, text);
    }

    return result;
};

/**
 * Get a client from the pool for transactions.
 * @returns {Promise} Database client
 */
const getClient = async () => {
    try {
        return await pool.connect();
    } catch (error) {
        throw normalizeDbError(error);
    }
};

module.exports = { pool, query, getClient };
