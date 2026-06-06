/**
 * Ticket Controller - QR Code Ticket Generation
 * Generates one QR-coded ticket per seat and emails receipt/tickets to the logged-in user.
 */

const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { sendEmail } = require('../utils/email');

function generateBookingId() {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `BK-${year}-${random}`;
}

function generateTicketId() {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TKT-${random}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getEmailFromAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    if (!token || token.startsWith('offline_token')) return null;

    try {
        return jwt.verify(token, jwtSecret).email || null;
    } catch (_) {
        return null;
    }
}

function formatMoney(value, currency) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString('en-US')} ${currency || 'EGP'}`;
}

function dataUrlToAttachment(dataUrl, filename, cid) {
    const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || '');
    if (!match) return null;

    return {
        filename,
        content: Buffer.from(match[2], 'base64'),
        contentType: match[1],
        cid,
    };
}

const QR_OPTIONS = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 280,
    color: {
        dark: '#000000',
        light: '#FFFFFF',
    },
};

async function sendTicketsEmail({ to, name, bookingId, purchaseTimestamp, tickets, movieTitle, date, time, experience, hall, currency, receipt }) {
    if (!to) return;

    const attachments = [];
    const ticketCards = tickets.map((ticket, index) => {
        const cid = `qr-${index}-${bookingId}@thehall`;
        const attachment = dataUrlToAttachment(ticket.qrCodeDataUrl, `ticket-${ticket.seatNumber}.png`, cid);
        if (attachment) attachments.push(attachment);

        return `
            <div style="display:inline-block;width:210px;margin:10px;padding:14px;border:1px solid #ddd;border-radius:8px;text-align:center;vertical-align:top;">
                <img src="cid:${cid}" alt="QR code for seat ${escapeHtml(ticket.seatNumber)}" width="170" height="170" style="display:block;margin:0 auto 10px;" />
                <div style="font-size:18px;font-weight:bold;color:#b71c1c;">Seat ${escapeHtml(ticket.seatNumber)}</div>
                <div style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(ticket.ticketId)}</div>
            </div>
        `;
    }).join('');

    const foodRows = Array.isArray(receipt?.foodItems) && receipt.foodItems.length
        ? receipt.foodItems.map(item => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatMoney(item.total, currency))}</td>
            </tr>
        `).join('')
        : `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">Food & Drinks</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatMoney(0, currency))}</td>
            </tr>
        `;

    await sendEmail({
        to,
        subject: `Your The Hall Cinema Tickets - ${movieTitle}`,
        attachments,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color:#b71c1c;text-align:center;">Your Tickets Are Ready</h2>
                <p>Hello ${escapeHtml(name || 'Cinema Goer')},</p>
                <p>Your booking is confirmed. Scan the QR code for each seat at the cinema entrance.</p>
                <div style="background:#f8f8f8;border-radius:8px;padding:14px;margin:18px 0;line-height:1.7;">
                    <div><strong>Booking Reference:</strong> ${escapeHtml(bookingId)}</div>
                    <div><strong>Movie:</strong> ${escapeHtml(movieTitle)}</div>
                    <div><strong>Date:</strong> ${escapeHtml(date)}</div>
                    <div><strong>Time:</strong> ${escapeHtml(time)}</div>
                    <div><strong>Experience:</strong> ${escapeHtml(experience)}</div>
                    <div><strong>Hall:</strong> ${escapeHtml(hall || 'Main Hall')}</div>
                    <div><strong>Seats:</strong> ${escapeHtml(tickets.map(t => t.seatNumber).join(', '))}</div>
                    <div><strong>Purchased:</strong> ${escapeHtml(new Date(purchaseTimestamp).toLocaleString('en-US'))}</div>
                </div>

                <h3 style="color:#333;">Receipt</h3>
                <table style="width:100%;border-collapse:collapse;margin:12px 0 20px;">
                    <tr>
                        <td style="padding:8px;border-bottom:1px solid #eee;">Tickets (${escapeHtml(tickets.length)} x ${escapeHtml(formatMoney(receipt?.pricePerSeat, currency))})</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatMoney(receipt?.ticketTotal, currency))}</td>
                    </tr>
                    ${foodRows}
                    <tr>
                        <td style="padding:10px 8px;font-weight:bold;border-top:2px solid #b71c1c;">Total Paid</td>
                        <td style="padding:10px 8px;font-weight:bold;text-align:right;border-top:2px solid #b71c1c;color:#b71c1c;">${escapeHtml(formatMoney(receipt?.totalPaid, currency))}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px;color:#666;">Payment Method</td>
                        <td style="padding:8px;color:#666;text-align:right;">${escapeHtml(receipt?.paymentMethod || 'Card')}</td>
                    </tr>
                </table>

                <h3 style="color:#333;">QR Tickets</h3>
                <div>${ticketCards}</div>
                <p style="color:#777;font-size:12px;margin-top:24px;">The Hall Cinema</p>
            </div>
        `,
    });

    console.log(`[TicketController] Ticket email sent to ${to} for ${bookingId}`);
}

async function generateTickets(req, res) {
    try {
        const {
            userEmail,
            userName,
            movieTitle,
            seats,
            date,
            time,
            experience,
            hall,
            pricePerSeat,
            currency,
            ticketTotal,
            foodTotal,
            totalPaid,
            paymentMethod,
            foodItems,
        } = req.body;

        const errors = [];
        if (!movieTitle || typeof movieTitle !== 'string' || movieTitle.trim() === '') errors.push('movieTitle is required and must be a non-empty string.');
        if (!Array.isArray(seats) || seats.length === 0) errors.push('seats is required and must be a non-empty array of seat labels.');
        if (!date || typeof date !== 'string' || date.trim() === '') errors.push('date is required and must be a non-empty string.');
        if (!time || typeof time !== 'string' || time.trim() === '') errors.push('time is required and must be a non-empty string.');
        if (!experience || typeof experience !== 'string' || experience.trim() === '') errors.push('experience is required and must be a non-empty string.');

        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        const bookingId = generateBookingId();
        const purchaseTimestamp = new Date().toISOString();
        const tickets = [];

        for (const seat of seats) {
            const ticketId = generateTicketId();
            const qrPayload = {
                bookingId,
                ticketId,
                movie: movieTitle.trim(),
                cinema: 'The Hall Cinema',
                experience: experience.trim(),
                hall: (hall || 'Main Hall').trim(),
                seat,
                date: date.trim(),
                time: time.trim(),
            };

            const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), QR_OPTIONS);
            tickets.push({
                ticketId,
                seatNumber: seat,
                qrCodeDataUrl,
                movieTitle: movieTitle.trim(),
                experience: experience.trim(),
                hall: (hall || 'Main Hall').trim(),
                date: date.trim(),
                time: time.trim(),
                pricePerSeat: pricePerSeat || 0,
                currency: currency || 'EGP',
            });
        }

        const effectiveCurrency = currency || 'EGP';
        const effectiveTicketTotal = Number(ticketTotal || ((pricePerSeat || 0) * tickets.length));
        const effectiveFoodTotal = Number(foodTotal || 0);
        const effectiveTotalPaid = Number(totalPaid || (effectiveTicketTotal + effectiveFoodTotal));
        const emailTo = getEmailFromAuth(req) || userEmail;

        console.log(`[TicketController] Ticket email target: ${emailTo || 'none'}`);
        try {
            await sendTicketsEmail({
                to: emailTo,
                name: userName,
                bookingId,
                purchaseTimestamp,
                tickets,
                movieTitle: movieTitle.trim(),
                date: date.trim(),
                time: time.trim(),
                experience: experience.trim(),
                hall: (hall || 'Main Hall').trim(),
                currency: effectiveCurrency,
                receipt: {
                    pricePerSeat: pricePerSeat || 0,
                    ticketTotal: effectiveTicketTotal,
                    foodTotal: effectiveFoodTotal,
                    totalPaid: effectiveTotalPaid,
                    paymentMethod,
                    foodItems: Array.isArray(foodItems) ? foodItems : [],
                },
            });
        } catch (emailError) {
            console.error('[TicketController] Failed to send ticket email:', emailError.message);
        }

        return res.status(200).json({
            bookingId,
            purchaseTimestamp,
            tickets,
            emailSentTo: emailTo || null,
        });
    } catch (error) {
        console.error('[TicketController] Error generating tickets:', error);
        return res.status(500).json({ error: 'Failed to generate tickets. Please try again.' });
    }
}

module.exports = { generateTickets };