/**
 * Server Entry Point - Cinema Booking System
 * Express + MongoDB/Mongoose
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const session = require('express-session');
const passport = require('./backend/config/passport');
const authRoutes = require('./routes/auth');
const { connectDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const movieRoutes = require('./routes/movies');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const showRoutes = require('./routes/shows');
const theaterRoutes = require('./routes/theaters');
const ticketRoutes = require('./routes/tickets');
const chatbotRoutes = require('./routes/chatbot');
const adminRoutes = require('./routes/admin');
const adminsRoutes = require('./routes/admins');
const chatbotBookingRoutes = require('./routes/chatbotBooking');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'development_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/chatbot', chatbotBookingRoutes);
app.use('/auth', authRoutes);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

if (require.main === module) {
    connectDatabase()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`\nCinema Booking API running on http://localhost:${PORT}`);
                console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
            });
        })
        .catch((error) => {
            console.error('Failed to connect to MongoDB:', error.message);
            process.exit(1);
        });
}

module.exports = app;
