/**
 * Database Configuration - MongoDB Connection
 * Uses Mongoose ODM to connect to MongoDB.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cinema_db';

/**
 * Connect to MongoDB.
 * @returns {Promise} Mongoose connection
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});

module.exports = { connectDB, mongoose };
