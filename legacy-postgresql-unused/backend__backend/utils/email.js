/**
 * Email Utility
 * Email sending functionality (placeholder - configure with your provider)
 */

const sendEmail = async ({ to, subject, html }) => {
    // TODO: Configure with nodemailer or a service like SendGrid
    console.log(`📧 Email would be sent to: ${to}`);
    console.log(`   Subject: ${subject}`);

    // Example nodemailer setup (uncomment when ready):
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //     host: process.env.MAIL_HOST,
    //     port: process.env.MAIL_PORT,
    //     auth: {
    //         user: process.env.MAIL_USER,
    //         pass: process.env.MAIL_PASS,
    //     },
    // });
    // await transporter.sendMail({ from: process.env.MAIL_USER, to, subject, html });
};

const sendBookingConfirmation = async (user, booking) => {
    await sendEmail({
        to: user.email,
        subject: `Booking Confirmed - ${booking.movie_title}`,
        html: `<h1>Booking Confirmed!</h1><p>Hi ${user.name}, your booking for ${booking.movie_title} has been confirmed.</p>`,
    });
};

module.exports = { sendEmail, sendBookingConfirmation };
