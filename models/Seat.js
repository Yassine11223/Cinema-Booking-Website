/**
 * Seat Model - Mongoose Schema
 */

const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
    {
        theater_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Theater',
            required: true,
        },
        row_label: {
            type: String,
            required: true,
            maxlength: 5,
        },
        seat_number: {
            type: Number,
            required: true,
        },
        seat_type: {
            type: String,
            enum: ['standard', 'premium', 'vip'],
            default: 'standard',
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

seatSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Compound unique index
seatSchema.index({ theater_id: 1, row_label: 1, seat_number: 1 }, { unique: true });

// ---- Static Methods ----

seatSchema.statics.findByTheater = async function (theaterId) {
    return this.find({ theater_id: theaterId }).sort({ row_label: 1, seat_number: 1 });
};

seatSchema.statics.findAvailableByShow = async function (showId) {
    const Show = mongoose.model('Show');
    const Booking = mongoose.model('Booking');

    // Get the show to find its theater
    const show = await Show.findById(showId);
    if (!show) return [];

    // Get all booked seat IDs for this show (non-cancelled bookings)
    const bookings = await Booking.find({
        show_id: showId,
        status: { $ne: 'cancelled' },
    }).select('seats');

    const bookedSeatIds = bookings.flatMap((b) => b.seats.map((s) => s.toString()));

    // Get all seats for the theater, excluding booked ones
    const query = { theater_id: show.theater_id };
    if (bookedSeatIds.length > 0) {
        query._id = { $nin: bookedSeatIds };
    }

    return this.find(query).sort({ row_label: 1, seat_number: 1 });
};

seatSchema.statics.createBulk = async function (theaterId, seats) {
    const docs = seats.map((seat) => ({
        theater_id: theaterId,
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type || 'standard',
    }));
    return this.insertMany(docs, { ordered: false });
};

const Seat = mongoose.model('Seat', seatSchema);

module.exports = Seat;
