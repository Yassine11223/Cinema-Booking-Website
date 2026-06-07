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
const seatRoutes = require('./routes/seats');
const theaterRoutes = require('./routes/theaters');
const ticketRoutes = require('./routes/tickets');
const chatbotRoutes = require('./routes/chatbot');
const chatbotBookingRoutes = require('./routes/chatbotBooking');
const contactRoutes = require('./routes/contact');
const adminsRoutes = require('./routes/admins');

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
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public', 'uploads', 'avatars')));

// Serve frontend files directly from the backend (handling both possible project structures)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// --- API Routes ---
app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
console.log('Users routes mounted at /api/users');
app.use('/api/payments', paymentRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/chatbot', chatbotBookingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admins', adminsRoutes);

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
