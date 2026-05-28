/**
 * OTP Utility — In-Memory OTP Store
 * Generates and verifies 6-digit OTP codes for 2-step login verification
 */

// In-memory store: Map<email, { code, expiresAt, attempts }>
const otpStore = new Map();

// Auto-cleanup expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(email);
        }
    }
}, 5 * 60 * 1000);

/**
 * Generate a 6-digit OTP for the given email
 * @param {string} email
 * @param {number} ttlMinutes — Time-to-live in minutes (default 10)
 * @returns {string} The 6-digit OTP code
 */
function generateOTP(email, ttlMinutes = 10) {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

    otpStore.set(email.toLowerCase(), {
        code,
        expiresAt,
        attempts: 0,
    });

    console.log(`🔐 OTP generated for ${email}: ${code} (expires in ${ttlMinutes}m)`);
    return code;
}

/**
 * Verify an OTP code for the given email
 * @param {string} email
 * @param {string} code
 * @returns {{ valid: boolean, message: string }}
 */
function verifyOTP(email, code) {
    const key = email.toLowerCase();
    const data = otpStore.get(key);

    if (!data) {
        return { valid: false, message: 'No verification code found. Please request a new one.' };
    }

    if (Date.now() > data.expiresAt) {
        otpStore.delete(key);
        return { valid: false, message: 'Verification code has expired. Please request a new one.' };
    }

    // Max 5 attempts
    if (data.attempts >= 5) {
        otpStore.delete(key);
        return { valid: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    if (data.code !== code) {
        data.attempts++;
        return { valid: false, message: 'Invalid verification code. Please try again.' };
    }

    // Success — remove OTP
    otpStore.delete(key);
    return { valid: true, message: 'Verification successful.' };
}

/**
 * Check if an OTP exists and is still valid for the email
 * @param {string} email
 * @returns {boolean}
 */
function hasValidOTP(email) {
    const data = otpStore.get(email.toLowerCase());
    if (!data) return false;
    if (Date.now() > data.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return false;
    }
    return true;
}

module.exports = { generateOTP, verifyOTP, hasValidOTP };
