/**
 * Email Utility
 * Sends emails via SMTP (Gmail)
 */

const nodemailer = require('nodemailer');

// Configure the SMTP transporter using Gmail and App Password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cinemavisionx@gmail.com',
        pass: 'lhfxdricewtyotda' // 16-letter App Password (lhfx dric ewty otda)
    }
});

/**
 * Generic email sender
 */
const sendEmail = async ({ to, subject, html }) => {
    try {
        await transporter.sendMail({
            from: '"Vision X Cinemas" <cinemavisionx@gmail.com>',
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent successfully to: ${to}`);
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        // Do not crash the process; log the error
    }
};

/**
 * Send Booking Confirmation
 */
const sendBookingConfirmation = async (user, booking) => {
    await sendEmail({
        to: user.email,
        subject: `Booking Confirmed - ${booking.movie_title}`,
        html: `<h1>Booking Confirmed!</h1><p>Hi ${user.name}, your booking for ${booking.movie_title} has been confirmed.</p>`,
    });
};

/**
 * Send OTP Verification Email
 */
const sendOTPEmail = async (email, name, otpCode) => {
    await sendEmail({
        to: email,
        subject: 'Vision X Cinemas | 2-Step Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 8px; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <span style="color: #e50914; font-size: 26px; font-weight: bold; letter-spacing: 2px;">VISION X</span>
                    <span style="color: #ffffff; font-size: 26px; font-weight: bold; letter-spacing: 2px;">CINEMAS</span>
                </div>
                <h2 style="color: #ffffff; border-bottom: 1px solid #333; padding-bottom: 10px;">Verification Code</h2>
                <p>Hello ${name || 'Customer'},</p>
                <p>To complete your sign-in, please enter the following 6-digit verification code on the login page. This code is valid for 10 minutes.</p>
                <div style="background-color: #141414; border: 1px solid #e50914; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ff4b4b;">${otpCode}</span>
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #333; padding-top: 15px;">
                    If you did not request this sign-in attempt, please ignore this email.
                </p>
            </div>
        `
    });
};

module.exports = { sendEmail, sendBookingConfirmation, sendOTPEmail };
