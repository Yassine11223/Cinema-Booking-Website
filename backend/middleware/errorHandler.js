/**
 * Global Error Handler Middleware
 * Catches all errors and sends a clean response
 */

const errorHandler = (err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Avatar image must be 2MB or smaller.' });
    }

    console.error('❌ Error:', err.message);

    // Mongoose duplicate key error (unique constraint violation)
    if (err.code === 11000 || err.name === 'MongoServerError' && err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return res.status(409).json({
            message: `A record with this ${field} already exists.`,
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            message: 'Validation failed',
            errors: messages,
        });
    }

    // Mongoose CastError (invalid ObjectId format)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        return res.status(400).json({
            message: 'Invalid ID format.',
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
