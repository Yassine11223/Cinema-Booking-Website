/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 * Supports customer, staff, and admin roles
 */

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { ROLES } = require('../config/constants');

/**
 * Verify JWT token - protects routes that need login
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded; // { id, email, role }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

/**
 * Admin-only access
 */
const adminOnly = (req, res, next) => {
    if (req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

/**
 * Staff-only access (allows staff AND admin)
 */
const staffOnly = (req, res, next) => {
    if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ message: 'Access denied. Staff or admin only.' });
    }
    next();
};

/**
 * Staff or Admin access — alias for staffOnly
 */
const staffOrAdmin = staffOnly;

/**
 * Generate JWT token for a user
 */
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
    );
};

module.exports = { authenticate, adminOnly, staffOnly, staffOrAdmin, generateToken };
