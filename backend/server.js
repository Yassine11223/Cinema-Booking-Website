/**
 * Server Entry Point - Cinema Booking System
 * Express + PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool } = require('./config/database');
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

// --- API Routes ---
app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Ensure Required User Columns ---
const ensureUserColumns = async () => {
    try {
        const { query } = require('./config/database');

        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
            ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local',
            ADD COLUMN IF NOT EXISTS profile_photo TEXT;
        `);

        await query(`
            ALTER TABLE users 
            ALTER COLUMN password DROP NOT NULL;
        `);

        console.log('✅ Database schema verified: OTP and Google login columns exist.');
    } catch (err) {
        console.error('❌ Failed to ensure user columns in database:', err.message);
    }
};

// --- Start Server ---
ensureUserColumns().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🎬 Cinema Booking API running on http://localhost:${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
});

module.exports = app;