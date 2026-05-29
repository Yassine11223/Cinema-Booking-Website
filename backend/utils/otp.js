/**
 * OTP Utility
 * Generates numeric codes for 2-step verification
 */

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { generateOTP };
