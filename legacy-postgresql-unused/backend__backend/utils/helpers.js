/**
 * Helper Functions
 */

/**
 * Format a price as currency string
 */
const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
};

/**
 * Generate a booking reference code
 */
const generateBookingRef = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = 'SC-';
    for (let i = 0; i < 6; i++) {
        ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
};

/**
 * Paginate query results
 */
const paginate = (page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    return { limit: Math.min(limit, 100), offset };
};

module.exports = { formatPrice, generateBookingRef, paginate };
