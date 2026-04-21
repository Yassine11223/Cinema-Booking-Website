/**
 * Optional Authentication Middleware
 * Verifies JWT if present but allows requests through without a token.
 * Use during development so the admin panel works without login.
 */

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/**
 * If a valid Bearer token is present, decode and attach user.
 * If no token or invalid token, attach a default admin user and continue.
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, jwtSecret);
            req.user = decoded;
            return next();
        } catch (error) {
            // Token is invalid/expired — fall through to default
            console.warn('⚠️ Invalid token provided, using default admin access');
        }
    }

    // No token or invalid token — grant admin access for development
    req.user = { id: 0, email: 'dev-admin@local', role: 'admin' };
    next();
};

/**
 * Skip admin-only check if using optional auth (user.role is already set)
 */
const optionalAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Access denied. Admin only.' });
};

module.exports = { optionalAuth, optionalAdminOnly };
