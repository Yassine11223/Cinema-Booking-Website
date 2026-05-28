/**
 * Email Utility
 * Real nodemailer transport with console fallback when SMTP is not configured.
 * Includes styled HTML templates for OTP, welcome, and newsletter emails.
 */

const nodemailer = require('nodemailer');

// ============================================
// TRANSPORT SETUP
// ============================================
let transporter = null;
let emailEnabled = false;

try {
    const host = process.env.MAIL_HOST;
    const port = process.env.MAIL_PORT;
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (host && user && pass) {
        transporter = nodemailer.createTransport({
            host,
            port: parseInt(port) || 587,
            secure: parseInt(port) === 465,
            auth: { user, pass },
        });
        emailEnabled = true;
        console.log('📧 Email transport configured successfully');
    } else {
        console.log('📧 Email SMTP not configured — using console fallback');
    }
} catch (err) {
    console.log('📧 Email setup error — using console fallback:', err.message);
}

// ============================================
// CINEMA BRAND STYLES
// ============================================
const BRAND = {
    name: 'Vision X Cinemas',
    color: '#e50914',
    bgDark: '#0a0a0a',
    bgCard: '#141414',
    textLight: '#ffffff',
    textMuted: '#b3b3b3',
    borderColor: '#2a2a2a',
};

// Base HTML email wrapper
function emailWrapper(content) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:${BRAND.bgDark};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <!-- Header -->
            <div style="text-align:center;padding:30px 0;border-bottom:1px solid ${BRAND.borderColor};">
                <h1 style="margin:0;font-size:28px;letter-spacing:4px;">
                    <span style="color:${BRAND.color};font-weight:800;">VISION X</span>
                    <span style="color:${BRAND.textLight};font-weight:300;">CINEMAS</span>
                </h1>
            </div>
            <!-- Content -->
            <div style="padding:40px 0;">
                ${content}
            </div>
            <!-- Footer -->
            <div style="text-align:center;padding:30px 0;border-top:1px solid ${BRAND.borderColor};color:${BRAND.textMuted};font-size:12px;">
                <p style="margin:0 0 8px;">© ${new Date().getFullYear()} Vision X Cinemas. All rights reserved.</p>
                <p style="margin:0;color:#666;">This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;
}

// ============================================
// SEND EMAIL (core function)
// ============================================
async function sendEmail({ to, subject, html }) {
    if (emailEnabled && transporter) {
        try {
            await transporter.sendMail({
                from: `"Vision X Cinemas" <${process.env.MAIL_USER}>`,
                to,
                subject,
                html,
            });
            console.log(`📧 Email sent to: ${to} | Subject: ${subject}`);
            return { success: true };
        } catch (err) {
            console.error(`📧 Email send failed: ${err.message}`);
            return { success: false, error: err.message };
        }
    } else {
        // Console fallback
        console.log(`📧 [CONSOLE FALLBACK] Email to: ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   (Email content logged — configure SMTP to send real emails)`);
        return { success: true, fallback: true };
    }
}

// ============================================
// OTP VERIFICATION EMAIL
// ============================================
async function sendOTPEmail(to, otpCode, userName = 'there') {
    const html = emailWrapper(`
        <h2 style="color:${BRAND.textLight};font-size:24px;margin:0 0 16px;font-weight:600;">
            Verify Your Login
        </h2>
        <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.8;margin:0 0 30px;">
            Hi ${userName}, we received a login request for your account. Use the verification code below to complete your sign-in:
        </p>
        <div style="background:${BRAND.bgCard};border:1px solid ${BRAND.borderColor};border-radius:16px;padding:35px;text-align:center;margin:0 0 30px;">
            <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:${BRAND.textLight};font-family:'Courier New',monospace;">
                ${otpCode}
            </div>
            <p style="color:${BRAND.textMuted};font-size:13px;margin:16px 0 0;">
                This code expires in <strong style="color:${BRAND.color};">10 minutes</strong>
            </p>
        </div>
        <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.7;margin:0;">
            If you didn't request this, please ignore this email or contact support. Your account remains secure.
        </p>
    `);

    return sendEmail({
        to,
        subject: `🔐 Your Vision X Cinemas Verification Code: ${otpCode}`,
        html,
    });
}

// ============================================
// WELCOME EMAIL
// ============================================
async function sendWelcomeEmail(to, userName) {
    const html = emailWrapper(`
        <h2 style="color:${BRAND.textLight};font-size:24px;margin:0 0 16px;font-weight:600;">
            Welcome to Vision X Cinemas! 🎬
        </h2>
        <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.8;margin:0 0 25px;">
            Hi ${userName}, your account has been created successfully. Get ready to experience cinema like never before.
        </p>
        <div style="background:${BRAND.bgCard};border:1px solid ${BRAND.borderColor};border-radius:16px;padding:30px;margin:0 0 25px;">
            <h3 style="color:${BRAND.textLight};font-size:16px;margin:0 0 20px;">What's waiting for you:</h3>
            <div style="color:${BRAND.textMuted};font-size:14px;line-height:2;">
                🎥 IMAX, Dolby Cinema & Standard experiences<br>
                🍿 Order food & drinks for your seat<br>
                💺 Choose your perfect seat<br>
                🎟️ Digital QR tickets on your phone
            </div>
        </div>
        <div style="text-align:center;">
            <a href="#" style="display:inline-block;padding:14px 40px;background:${BRAND.color};color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:14px;letter-spacing:1px;">
                BROWSE MOVIES
            </a>
        </div>
    `);

    return sendEmail({
        to,
        subject: `🎬 Welcome to Vision X Cinemas, ${userName}!`,
        html,
    });
}

// ============================================
// BOOKING CONFIRMATION EMAIL
// ============================================
async function sendBookingConfirmation(user, booking) {
    const html = emailWrapper(`
        <h2 style="color:${BRAND.textLight};font-size:24px;margin:0 0 16px;font-weight:600;">
            Booking Confirmed! ✅
        </h2>
        <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.8;margin:0 0 25px;">
            Hi ${user.name}, your booking has been confirmed. Here are your details:
        </p>
        <div style="background:${BRAND.bgCard};border:1px solid ${BRAND.borderColor};border-radius:16px;padding:30px;margin:0 0 25px;">
            <h3 style="color:${BRAND.textLight};font-size:18px;margin:0 0 15px;">
                ${booking.movie_title || 'Movie'}
            </h3>
            <div style="color:${BRAND.textMuted};font-size:14px;line-height:2;">
                📅 ${booking.show_time || 'TBD'}<br>
                💺 ${booking.seats || 'Assigned'}<br>
                💰 ${booking.total_price ? `$${booking.total_price}` : 'Paid'}
            </div>
        </div>
        <p style="color:${BRAND.textMuted};font-size:13px;">
            Show your QR code ticket at the entrance. Enjoy the show!
        </p>
    `);

    return sendEmail({
        to: user.email,
        subject: `🎟️ Booking Confirmed — ${booking.movie_title || 'Your Movie'}`,
        html,
    });
}

// ============================================
// NEWSLETTER EMAIL
// ============================================
async function sendNewsletterEmail(to, userName, newsItems = []) {
    const newsHtml = newsItems.map(item => `
        <div style="background:${BRAND.bgCard};border:1px solid ${BRAND.borderColor};border-radius:12px;padding:20px;margin:0 0 15px;">
            <h3 style="color:${BRAND.textLight};font-size:16px;margin:0 0 8px;">${item.title}</h3>
            <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.6;margin:0;">${item.description}</p>
        </div>
    `).join('');

    const html = emailWrapper(`
        <h2 style="color:${BRAND.textLight};font-size:24px;margin:0 0 16px;font-weight:600;">
            Latest from Vision X Cinemas 🎬
        </h2>
        <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.8;margin:0 0 30px;">
            Hi ${userName}, here's what's new at Vision X Cinemas:
        </p>
        ${newsHtml || '<p style="color:' + BRAND.textMuted + ';">No news items at this time.</p>'}
        <div style="text-align:center;margin:30px 0 0;">
            <a href="#" style="display:inline-block;padding:14px 40px;background:${BRAND.color};color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:14px;letter-spacing:1px;">
                VIEW ALL MOVIES
            </a>
        </div>
    `);

    return sendEmail({
        to,
        subject: `🎬 Latest News from Vision X Cinemas`,
        html,
    });
}

module.exports = {
    sendEmail,
    sendOTPEmail,
    sendWelcomeEmail,
    sendBookingConfirmation,
    sendNewsletterEmail,
};
