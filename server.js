/**
 * Server Entry Point - Cinema Booking System
 * Express + PostgreSQL
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const session = require('express-session');
const passport = require('./backend/config/passport');
const authRoutes = require('./routes/auth');
const { pool } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const movieRoutes = require('./routes/movies');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const showRoutes = require('./routes/shows');
const theaterRoutes = require('./routes/theaters');
const ticketRoutes = require('./routes/tickets');
const chatbotRoutes = require('./routes/chatbot');
const chatbotBookingRoutes = require('./routes/chatbotBooking');

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
// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set to true only in production with HTTPS
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- API Routes ---
app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/chatbot', chatbotBookingRoutes);
app.use('/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`\n🎬 Cinema Booking API running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
