/**
 * Environment Configuration
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
    jwtExpiresIn: '7d',
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinema_db',
    mail: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT) || 587,
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
        from: process.env.MAIL_FROM,
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',
};
