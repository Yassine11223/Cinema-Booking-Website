/**
 * Validation Utility Functions
 */

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone) => {
    return /^\+?[\d\s-]{8,15}$/.test(phone);
};

const isPositiveNumber = (value) => {
    return typeof value === 'number' && value > 0;
};

const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

module.exports = { isValidEmail, isValidPhone, isPositiveNumber, isValidDate };
