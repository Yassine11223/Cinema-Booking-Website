const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.MAIL_PORT) || 587,
        secure: String(process.env.MAIL_PORT) === '465',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSeatLabel(seat) {
    if (seat.label) return seat.label;
    if (seat.row_label && seat.seat_number) return `${seat.row_label}${seat.seat_number}`;
    return String(seat.seat_number || seat._id || 'Seat');
}

async function buildQrTickets(booking, ticketMeta) {
    const bookingId = String(booking.id || booking._id);
    const seats = Array.isArray(booking.seats) ? booking.seats : [];

    return Promise.all(seats.map(async (seat, index) => {
        const seatLabel = getSeatLabel(seat);
        const ticketId = `TKT-${bookingId.slice(-6).toUpperCase()}-${String(index + 1).padStart(2, '0')}`;
        const qrPayload = {
            bookingId,
            ticketId,
            movie: ticketMeta.movieTitle,
            cinema: 'The Hall Cinema',
            hall: ticketMeta.hall,
            seat: seatLabel,
            date: ticketMeta.displayDate,
            time: ticketMeta.displayTime,
        };

        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            margin: 2,
            width: 180,
        });

        return { ticketId, seatLabel, qrCodeDataUrl };
    }));
}

async function sendTicketEmail(booking, user) {
    if (!user || !user.email) {
        console.warn('[EmailService] No user email provided. Skipping email confirmation.');
        return;
    }

    try {
        const transporter = createTransporter();
        const seatList = booking.seats && booking.seats.length > 0
            ? booking.seats.map(getSeatLabel).join(', ')
            : 'Unassigned';

        const location = 'Misr International University (MIU), KM 28 Cairo - Ismailia Road, Cairo Governorate, Egypt';
        const movieTitle = booking.movie_title || booking.show_id?.movie_id?.title || 'Unknown Movie';
        const showTime = booking.show_time || booking.show_id?.show_time || 'Unknown Time';
        const hall = booking.theater_name || booking.show_id?.theater_id?.name || 'Main Hall';
        const date = new Date(showTime);
        const displayDate = isNaN(date.getTime()) ? showTime : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const displayTime = isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const tickets = await buildQrTickets(booking, { movieTitle, hall, displayDate, displayTime });
        const ticketHtml = tickets.map(ticket => `
            <div style="display:inline-block;width:180px;margin:10px;padding:12px;border:1px solid #ddd;border-radius:8px;text-align:center;vertical-align:top;">
                <img src="${ticket.qrCodeDataUrl}" alt="QR code for seat ${escapeHtml(ticket.seatLabel)}" width="150" height="150" style="display:block;margin:0 auto 10px;" />
                <div style="font-size:18px;font-weight:bold;color:#b71c1c;">Seat ${escapeHtml(ticket.seatLabel)}</div>
                <div style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(ticket.ticketId)}</div>
            </div>
        `).join('');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #b71c1c; text-align: center;">Your Cinema Ticket Booking Confirmation</h2>
                <p>Hello ${escapeHtml(user.name || 'Cinema Goer')},</p>
                <p>Thank you for your booking. Your tickets are confirmed.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
                    <ul style="list-style: none; padding: 0; line-height: 1.6;">
                        <li><strong>Booking Reference:</strong> ${escapeHtml(booking.id || booking._id)}</li>
                        <li><strong>Movie:</strong> ${escapeHtml(movieTitle)}</li>
                        <li><strong>Date:</strong> ${escapeHtml(displayDate)}</li>
                        <li><strong>Time:</strong> ${escapeHtml(displayTime)}</li>
                        <li><strong>Hall:</strong> ${escapeHtml(hall)}</li>
                        <li><strong>Seats:</strong> ${escapeHtml(seatList)}</li>
                        <li><strong>Total Price:</strong> ${escapeHtml(booking.total_price)} EGP</li>
                        <li><strong>Location:</strong> ${escapeHtml(location)}</li>
                    </ul>
                </div>
                <h3 style="color:#333;">QR Tickets</h3>
                <div>${ticketHtml || '<p>No seat QR codes were generated.</p>'}</div>
                <p>Please present your booking reference at the counter or scan your QR code on arrival.</p>
                <p>Enjoy the movie!</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    The Hall Cinemas<br>
                    ${escapeHtml(location)}
                </p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || `"The Hall Cinemas" <${process.env.MAIL_USER}>`,
            to: user.email,
            subject: 'Your Cinema Ticket Booking Confirmation',
            html: htmlContent,
        });
        console.log(`[EmailService] Ticket confirmation sent to ${user.email}. MessageId: ${info.messageId}`);
    } catch (error) {
        console.error('[EmailService] Failed to send ticket confirmation email:', error.message);
    }
}

module.exports = { sendTicketEmail };
