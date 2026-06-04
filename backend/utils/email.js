/**
 * Email Utility
 * Sends emails via SMTP.
 */

const nodemailer = require('nodemailer');

function getMailConfig() {
    const user = process.env.MAIL_USER || process.env.EMAIL_USER;
    return {
        host: process.env.MAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.MAIL_PORT || process.env.EMAIL_PORT) || 587,
        user,
        pass: process.env.MAIL_PASS || process.env.EMAIL_PASS,
        from: process.env.MAIL_FROM || process.env.EMAIL_FROM || `"The Hall Cinema" <${user}>`,
    };
}

function createTransporter() {
    const mail = getMailConfig();
    return nodemailer.createTransport({
        host: mail.host,
        port: mail.port,
        secure: String(mail.port) === '465',
        auth: {
            user: mail.user,
            pass: mail.pass,
        },
    });
}

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const transporter = createTransporter();
        const mail = getMailConfig();
        await transporter.sendMail({
            from: mail.from,
            to,
            subject,
            html,
            attachments,
        });
        console.log(`Email sent successfully to: ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error.message);
        throw error;
    }
};

const sendBookingConfirmation = async (user, booking) => {
    await sendEmail({
        to: user.email,
        subject: `Booking Confirmed - ${booking.movie_title}`,
        html: `<h1>Booking Confirmed!</h1><p>Hi ${user.name}, your booking for ${booking.movie_title} has been confirmed.</p>`,
    });
};

const sendOTPEmail = async (email, name, otpCode) => {
    await sendEmail({
        to: email,
        subject: 'The Hall Cinema | 2-Step Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 8px; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <span style="color: #e50914; font-size: 26px; font-weight: bold; letter-spacing: 2px;">THE HALL</span>
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
        `,
    });
};

module.exports = { sendEmail, sendBookingConfirmation, sendOTPEmail };
