const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const QR_OPTIONS = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 240,
    color: {
        dark: '#000000',
        light: '#FFFFFF',
    },
};

// Public QR code generation API — Gmail can load these images since they're HTTPS URLs
const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';

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

function safeCidToken(value) {
    return String(value || 'seat')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'seat';
}

function getSeatQrFilename(seatLabel) {
    return `qr-seat-${safeCidToken(seatLabel)}.png`;
}

/**
 * Build a publicly accessible QR image URL using api.qrserver.com.
 * Gmail will fetch this over HTTPS and display it inline — no CID needed.
 */
function buildPublicQrImageUrl(qrPayloadString) {
    return `${QR_API_BASE}?size=220x220&data=${encodeURIComponent(qrPayloadString)}`;
}

function screenTypeToExperience(screenType, hall) {
    const value = String(screenType || hall || '').toLowerCase();
    if (value.includes('imax') || value === '3d') return 'IMAX';
    if (value.includes('dolby')) return 'Dolby';
    if (value.includes('vip') || value.includes('deluxe')) return 'Deluxe';
    if (value.includes('4dx')) return '4DX';
    return 'Standard';
}

function publicTicket(ticket) {
    return {
        ticketId: ticket.ticketId,
        seatId: ticket.seatId,
        seatNumber: ticket.seatLabel,
        qrCodeDataUrl: ticket.qrCodeDataUrl,
        qrPayload: ticket.qrPayload,
        qrImageUrl: ticket.qrImageUrl,
        movieTitle: ticket.movieTitle,
        experience: ticket.experience,
        hall: ticket.hall,
        date: ticket.date,
        time: ticket.time,
        showTime: ticket.showTime,
        pricePerSeat: ticket.pricePerSeat,
        currency: ticket.currency,
    };
}

async function buildQrTickets(booking, ticketMeta) {
    const bookingId = String(booking.id || booking._id);
    const seats = Array.isArray(booking.seats) ? booking.seats : [];
    const pricePerSeat = seats.length ? Number(booking.total_price || 0) / seats.length : Number(booking.total_price || 0);

    return Promise.all(seats.map(async (seat, index) => {
        const seatLabel = getSeatLabel(seat);
        const seatId = String(seat.id || seat._id || '');
        const ticketId = `TKT-${bookingId.slice(-6).toUpperCase()}-${String(index + 1).padStart(2, '0')}`;
        const qrPayload = {
            type: 'the-hall-ticket',
            version: 1,
            bookingId,
            ticketId,
            seatId,
            showId: ticketMeta.showId,
            movieId: ticketMeta.movieId,
            movie: ticketMeta.movieTitle,
            cinema: 'The Hall Cinemas',
            experience: ticketMeta.experience,
            hall: ticketMeta.hall,
            seat: seatLabel,
            showTime: ticketMeta.showTimeIso,
            date: ticketMeta.displayDate,
            time: ticketMeta.displayTime,
            totalPrice: Number(booking.total_price || 0),
            currency: ticketMeta.currency,
        };

        const qrPayloadString = JSON.stringify(qrPayload);

        // Generate base64 data URL for frontend ticket display
        const qrCodeDataUrl = await QRCode.toDataURL(qrPayloadString, QR_OPTIONS);

        // Generate raw PNG buffer for email attachment (downloadable backup)
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');

        // Build public QR image URL for inline email display (Gmail-compatible)
        const qrImageUrl = buildPublicQrImageUrl(qrPayloadString);

        return {
            ticketId,
            seatId,
            seatLabel,
            qrPayload,
            qrPayloadString,
            qrCodeDataUrl,
            qrBuffer,
            qrImageUrl,
            movieTitle: ticketMeta.movieTitle,
            experience: ticketMeta.experience,
            hall: ticketMeta.hall,
            date: ticketMeta.displayDate,
            time: ticketMeta.displayTime,
            showTime: ticketMeta.showTimeIso,
            pricePerSeat,
            currency: ticketMeta.currency,
        };
    }));
}

async function sendTicketEmail(booking, user) {
    const bookingId = String(booking.id || booking._id);
    const purchaseTimestamp = new Date().toISOString();
    const movieTitle = booking.movie_title || booking.show_id?.movie_id?.title || 'Unknown Movie';
    const showTime = booking.show_time || booking.show_id?.show_time || null;
    const hall = booking.theater_name || booking.show_id?.theater_id?.name || 'Main Hall';
    const experience = screenTypeToExperience(booking.show_id?.theater_id?.screen_type, hall);
    const showId = String(booking.show_id?._id || booking.show_id || '');
    const movieId = String(booking.show_id?.movie_id?._id || booking.show_id?.movie_id || '');
    const currency = 'EGP';
    const date = new Date(showTime);
    const displayDate = isNaN(date.getTime()) ? (showTime || 'Unknown Date') : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const displayTime = isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const showTimeIso = isNaN(date.getTime()) ? '' : date.toISOString();
    const tickets = await buildQrTickets(booking, {
        movieTitle,
        hall,
        experience,
        displayDate,
        displayTime,
        showTimeIso,
        showId,
        movieId,
        currency,
    });

    const result = {
        bookingId,
        purchaseTimestamp,
        tickets: tickets.map(publicTicket),
        recipient: user?.email || null,
        emailSent: false,
        messageId: null,
        error: null,
    };

    if (!user || !user.email) {
        console.warn('[EmailService] No user email provided. Skipping email confirmation.');
        result.error = 'No user email provided';
        return result;
    }

    try {
        const transporter = createTransporter();
        const seatList = booking.seats && booking.seats.length > 0
            ? booking.seats.map(getSeatLabel).join(', ')
            : 'Unassigned';

        const location = 'Misr International University (MIU), KM 28 Cairo - Ismailia Road, Cairo Governorate, Egypt';

        // Keep QR PNGs as downloadable attachments (backup), but NOT as CID inline
        const attachments = tickets.map(ticket => ({
            filename: getSeatQrFilename(ticket.seatLabel),
            content: ticket.qrBuffer,
            contentType: 'image/png',
            contentDisposition: 'attachment',
        }));

        // Use public QR image URLs for inline display — Gmail loads these over HTTPS
        const ticketHtml = tickets.map(ticket => `
            <div style="display:inline-block;width:220px;margin:10px;padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;vertical-align:top;background-color:#ffffff;">
                <img src="${ticket.qrImageUrl}" alt="QR code for seat ${escapeHtml(ticket.seatLabel)}" width="180" height="180" style="display:block;border:1px solid #eee;border-radius:6px;margin:0 auto 10px;width:180px;height:180px;" />
                <div style="font-size:18px;font-weight:bold;color:#b71c1c;">Seat ${escapeHtml(ticket.seatLabel)}</div>
                <div style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(ticket.ticketId)}</div>
            </div>
        `).join('');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #b71c1c; text-align: center;">Your The Hall Booking Confirmation</h2>
                <p>Hello ${escapeHtml(user.name || 'Cinema Goer')},</p>
                <p>Thank you for your booking. Your tickets are confirmed.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
                    <ul style="list-style: none; padding: 0; line-height: 1.6;">
                        <li><strong>Booking Reference:</strong> ${escapeHtml(booking.id || booking._id)}</li>
                        <li><strong>Movie:</strong> ${escapeHtml(movieTitle)}</li>
                        <li><strong>Date:</strong> ${escapeHtml(displayDate)}</li>
                        <li><strong>Time:</strong> ${escapeHtml(displayTime)}</li>
                        <li><strong>Experience:</strong> ${escapeHtml(experience)}</li>
                        <li><strong>Hall:</strong> ${escapeHtml(hall)}</li>
                        <li><strong>Seats:</strong> ${escapeHtml(seatList)}</li>
                        <li><strong>Total Price:</strong> ${escapeHtml(booking.total_price)} EGP</li>
                        <li><strong>Location:</strong> ${escapeHtml(location)}</li>
                    </ul>
                </div>
                <h3 style="color:#333;">QR Tickets</h3>
                <p style="color:#666;font-size:13px;">Scan the QR code below at the cinema entrance. QR images are also attached as downloadable files.</p>
                <div style="text-align:center;">${ticketHtml || '<p>No seat QR codes were generated.</p>'}</div>
                <p>Please present your booking reference at the counter or scan your QR code on arrival.</p>
                <p>Enjoy the movie!</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    The Hall Cinemas<br>
                    ${escapeHtml(location)}
                </p>
            </div>
        `;

        const mailOptions = {
            from: process.env.MAIL_FROM || `"The Hall Cinemas" <${process.env.MAIL_USER}>`,
            to: user.email,
            subject: 'The Hall Booking Confirmation',
            html: htmlContent,
            attachments,
        };

        console.log('[EmailService] QR strategy: public URL (api.qrserver.com)');
        console.log('[EmailService] Ticket count:', tickets.length);
        tickets.forEach((t, i) => {
            console.log(`[EmailService] Ticket ${i + 1}: seat=${t.seatLabel}, ticketId=${t.ticketId}`);
            console.log(`[EmailService]   QR URL: ${t.qrImageUrl.substring(0, 120)}...`);
        });
        console.log('[EmailService] Attachments (backup):', mailOptions.attachments.map(a => a.filename));

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Ticket confirmation sent to ${user.email}. MessageId: ${info.messageId}`);
        result.emailSent = true;
        result.messageId = info.messageId || null;
        return result;
    } catch (error) {
        console.error('[EmailService] Failed to send ticket confirmation email:', error.message);
        result.error = error.message;
        return result;
    }
}

module.exports = { sendTicketEmail, buildQrTickets };
