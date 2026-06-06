/**
 * MongoDB/Mongoose connection.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinema_booking';

mongoose.set('strictQuery', true);

async function connectDatabase() {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
    return mongoose.connection;
}

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
});

module.exports = {
    connectDatabase,
    mongoose,
};
