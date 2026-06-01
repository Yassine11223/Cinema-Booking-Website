const nodemailer = require('nodemailer');

/**
 * Creates a configured nodemailer transporter.
 */
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

/**
 * Sends a ticket confirmation email to the user after successful booking.
 * 
 * @param {Object} booking - The fully populated booking object
 * @param {Object} user - The user object containing the email
 */
async function sendTicketEmail(booking, user) {
    if (!user || !user.email) {
        console.warn('[EmailService] No user email provided. Skipping email confirmation.');
        return;
    }

    try {
        const transporter = createTransporter();

        const seatList = booking.seats && booking.seats.length > 0 
            ? booking.seats.map(s => s.seat_number).join(', ') 
            : 'Unassigned';

        const location = "Misr International University (MIU), KM 28 Cairo – Ismailia Road, Cairo Governorate, Egypt";
        const movieTitle = booking.movie_title || booking.show_id?.movie_id?.title || 'Unknown Movie';
        const showTime = booking.show_time || booking.show_id?.show_time || 'Unknown Time';
        const date = new Date(showTime);
        const displayDate = isNaN(date.getTime()) ? showTime : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const displayTime = isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #b71c1c; text-align: center;">Your Cinema Ticket Booking Confirmation</h2>
                <p>Hello ${user.name || 'Cinema Goer'},</p>
                <p>Thank you for your booking! Your tickets are confirmed.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
                    <ul style="list-style: none; padding: 0; line-height: 1.6;">
                        <li><strong>Booking Reference:</strong> ${booking.id || booking._id}</li>
                        <li><strong>Movie:</strong> ${movieTitle}</li>
                        <li><strong>Date:</strong> ${displayDate}</li>
                        <li><strong>Time:</strong> ${displayTime}</li>
                        <li><strong>Seats:</strong> ${seatList}</li>
                        <li><strong>Total Price:</strong> ${booking.total_price} EGP</li>
                        <li><strong>Location:</strong> ${location}</li>
                    </ul>
                </div>
                
                <p>Please present your booking reference at the counter or scan your QR code on arrival.</p>
                <p>Enjoy the movie!</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    The Hall Cinemas<br>
                    ${location}
                </p>
            </div>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"The Hall Cinemas" <no-reply@thehallcinemas.com>',
            to: user.email,
            subject: 'Your Cinema Ticket Booking Confirmation',
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Ticket confirmation sent to ${user.email}. MessageId: ${info.messageId}`);
    } catch (error) {
        // Log the error but do not throw, to prevent booking flow from failing
        console.error('[EmailService] Failed to send ticket confirmation email:', error.message);
    }
}

module.exports = {
    sendTicketEmail
};
