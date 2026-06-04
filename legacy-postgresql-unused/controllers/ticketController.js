/**
 * Ticket Controller — QR Code Ticket Generation
 * 
 * Generates unique per-seat QR code tickets for confirmed bookings.
 * QR codes are created server-side using the `qrcode` npm package
 * and returned as base64 data URLs to the frontend.
 * 
 * FUTURE DATABASE INTEGRATION:
 * - Save generated tickets to a `tickets` table
 * - Verify booking exists before generating tickets
 * - Prevent duplicate ticket generation for the same booking
 * - Add ticket status tracking (valid, used, expired, cancelled)
 */

const QRCode = require('qrcode');

/* =========================================================
   HELPERS — ID Generation
   ========================================================= */

/**
 * Generate a unique booking ID in format: BK-YYYY-XXXXX
 * Uses current year + 5-digit random number for uniqueness.
 * 
 * FUTURE: Replace with database auto-increment or UUID.
 */
function generateBookingId() {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000); // 5-digit
    return `BK-${year}-${random}`;
}

/**
 * Generate a unique ticket ID in format: TKT-XXXXXX
 * Uses 6-digit random number for uniqueness.
 * 
 * FUTURE: Replace with database auto-increment or UUID.
 */
function generateTicketId() {
    const random = Math.floor(100000 + Math.random() * 900000); // 6-digit
    return `TKT-${random}`;
}

/* =========================================================
   QR CODE GENERATION OPTIONS
   ========================================================= */

/** QR code rendering options for high-quality, scannable output */
const QR_OPTIONS = {
    errorCorrectionLevel: 'M',  // Medium error correction (15% recovery)
    type: 'image/png',
    margin: 2,
    width: 280,                 // Pixel width — good balance of quality vs file size
    color: {
        dark: '#000000',        // Standard black modules
        light: '#FFFFFF',       // White background for maximum contrast
    },
};

/* =========================================================
   CONTROLLER — Generate Tickets
   ========================================================= */

/**
 * POST /api/tickets/generate
 * 
 * Receives booking data from the frontend and generates
 * one unique QR-coded ticket per booked seat.
 * 
 * Request Body:
 *   - movieTitle  (string, required) — Name of the movie
 *   - seats       (string[], required) — Array of seat labels (e.g. ["A1", "A2"])
 *   - date        (string, required) — Display date (e.g. "Wednesday, May 27")
 *   - time        (string, required) — Showtime (e.g. "19:00")
 *   - experience  (string, required) — Experience type (e.g. "IMAX", "Dolby")
 *   - hall        (string, optional) — Hall/theatre name
 *   - pricePerSeat (number, optional) — Price per seat
 *   - currency    (string, optional) — Currency code (default: "EGP")
 * 
 * Response (200):
 *   {
 *     bookingId: "BK-2026-48392",
 *     purchaseTimestamp: "2026-05-27T14:46:44.000Z",
 *     tickets: [
 *       { ticketId, seatNumber, qrCodeDataUrl },
 *       ...
 *     ]
 *   }
 */
async function generateTickets(req, res) {
    try {
        const {
            movieTitle,
            seats,
            date,
            time,
            experience,
            hall,
            pricePerSeat,
            currency,
        } = req.body;

        /* -------------------------------------------------------
           INPUT VALIDATION
           ------------------------------------------------------- */
        const errors = [];

        if (!movieTitle || typeof movieTitle !== 'string' || movieTitle.trim() === '') {
            errors.push('movieTitle is required and must be a non-empty string.');
        }
        if (!Array.isArray(seats) || seats.length === 0) {
            errors.push('seats is required and must be a non-empty array of seat labels.');
        }
        if (!date || typeof date !== 'string' || date.trim() === '') {
            errors.push('date is required and must be a non-empty string.');
        }
        if (!time || typeof time !== 'string' || time.trim() === '') {
            errors.push('time is required and must be a non-empty string.');
        }
        if (!experience || typeof experience !== 'string' || experience.trim() === '') {
            errors.push('experience is required and must be a non-empty string.');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors,
            });
        }

        /* -------------------------------------------------------
           GENERATE BOOKING ID & TIMESTAMP
           ------------------------------------------------------- */
        const bookingId = generateBookingId();
        const purchaseTimestamp = new Date().toISOString();

        /* -------------------------------------------------------
           GENERATE ONE TICKET PER SEAT
           
           FUTURE DATABASE INTEGRATION:
           - Insert each ticket into a `tickets` table
           - Link to `bookings` table via bookingId
           - Store QR payload hash for verification
           ------------------------------------------------------- */
        const tickets = [];

        for (const seat of seats) {
            const ticketId = generateTicketId();

            // Structured QR payload — contains all info needed to verify a ticket
            const qrPayload = {
                bookingId,
                ticketId,
                movie: movieTitle.trim(),
                cinema: 'THE HALL CINEMASs',
                experience: experience.trim(),
                hall: (hall || 'Main Hall').trim(),
                seat: seat,
                date: date.trim(),
                time: time.trim(),
            };

            // Generate QR code as base64 data URL (PNG image)
            const qrCodeDataUrl = await QRCode.toDataURL(
                JSON.stringify(qrPayload),
                QR_OPTIONS
            );

            tickets.push({
                ticketId,
                seatNumber: seat,
                qrCodeDataUrl,
                // Include metadata for frontend rendering
                movieTitle: movieTitle.trim(),
                experience: experience.trim(),
                hall: (hall || 'Main Hall').trim(),
                date: date.trim(),
                time: time.trim(),
                pricePerSeat: pricePerSeat || 0,
                currency: currency || 'EGP',
            });
        }

        /* -------------------------------------------------------
           RESPOND WITH TICKET DATA
           
           FUTURE: Also save to database here and return
           a permalink / retrieval URL for each ticket.
           ------------------------------------------------------- */
        return res.status(200).json({
            bookingId,
            purchaseTimestamp,
            tickets,
        });

    } catch (error) {
        console.error('[TicketController] Error generating tickets:', error);
        return res.status(500).json({
            error: 'Failed to generate tickets. Please try again.',
        });
    }
}

/* =========================================================
   EXPORTS
   ========================================================= */
module.exports = {
    generateTickets,
};
