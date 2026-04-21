/**
 * Input Validation Middleware
 * Validates request body before reaching controllers
 */

const validateRegistration = (req, res, next) => {
    const { name, email, password } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
    }

    if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters');
    } else {
        if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
        if (!/\d/.test(password)) errors.push('Password must contain a number');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    next();
};

const validateBooking = (req, res, next) => {
    const { show_id, seat_ids } = req.body;
    const errors = [];

    if (!show_id) {
        errors.push('Show ID is required');
    }

    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
        errors.push('At least one seat must be selected');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }

    next();
};

const validateMovie = (req, res, next) => {
    const { title, duration } = req.body;
    const errors = [];

    if (!title || title.trim().length === 0) {
        errors.push('Movie title is required');
    }

    if (!duration || duration < 1) {
        errors.push('Valid duration is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }

    next();
};

module.exports = { validateRegistration, validateLogin, validateBooking, validateMovie };
