/**
 * Application Constants
 */

module.exports = {
    // User roles
    ROLES: {
        CUSTOMER: 'customer',
        ADMIN: 'admin',
    },

    // Booking statuses
    BOOKING_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        CANCELLED: 'cancelled',
        COMPLETED: 'completed',
    },

    // Payment statuses
    PAYMENT_STATUS: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        FAILED: 'failed',
        REFUNDED: 'refunded',
    },

    // Movie statuses
    MOVIE_STATUS: {
        NOW_SHOWING: 'now_showing',
        COMING_SOON: 'coming_soon',
        ENDED: 'ended',
    },

    // Screen types
    SCREEN_TYPES: ['standard', 'imax', '3d', '4dx', 'vip'],

    // Seat types
    SEAT_TYPES: ['standard', 'premium', 'vip'],

    // Pagination defaults
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100,
    },
};
