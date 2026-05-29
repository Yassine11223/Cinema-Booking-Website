/**
 * Global Error Handler Middleware
 * Catches all errors and sends a clean response
 */

const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.message);

    // PostgreSQL unique constraint violation
    if (err.code === '23505') {
        return res.status(409).json({
            message: 'A record with this data already exists.',
        });
    }

    // PostgreSQL foreign key violation
    if (err.code === '23503') {
        return res.status(400).json({
            message: 'Referenced record does not exist.',
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
