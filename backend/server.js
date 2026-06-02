/**
 * Server Entry Point - Cinema Booking System
 * Express + MongoDB (Mongoose)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const passport = require('./config/passport');

// Import routes
const movieRoutes = require('./routes/movies');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const showRoutes = require('./routes/shows');
const theaterRoutes = require('./routes/theaters');
const ticketRoutes = require('./routes/tickets');
const chatbotRoutes = require('./routes/chatbot');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins in development (Live Server, file://, etc.)
        callback(null, true);
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Google OAuth / Passport
app.use(passport.initialize());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve frontend files directly from the backend (handling both possible project structures)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// --- API Routes ---
app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Start Server ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\nCinema Booking API running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
});

module.exports = app;
