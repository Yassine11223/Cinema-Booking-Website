/**
 * Booking Model - Mongoose Schema
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        show_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Show',
            required: true,
        },
        seats: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Seat',
            },
        ],
        total_price: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            default: 'pending',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

bookingSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Indexes
bookingSchema.index({ user_id: 1 });
bookingSchema.index({ show_id: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ show_id: 1, seats: 1, status: 1 });
bookingSchema.index(
    { show_id: 1, seats: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' }, name: 'unique_pending_show_seat' }
);
bookingSchema.index(
    { show_id: 1, seats: 1 },
    { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'unique_confirmed_show_seat' }
);
bookingSchema.index(
    { show_id: 1, seats: 1 },
    { unique: true, partialFilterExpression: { status: 'completed' }, name: 'unique_completed_show_seat' }
);

// ---- Static Methods ----

bookingSchema.statics.findAll = async function () {
    const bookings = await this.find()
        .populate('user_id', 'name email')
        .populate({
            path: 'show_id',
            populate: [
                { path: 'movie_id', select: 'title' },
                { path: 'theater_id', select: 'name' },
            ],
        })
        .sort({ created_at: -1 });

    return bookings.map((b) => {
        const obj = b.toObject();
        obj.user_name = obj.user_id?.name || null;
        obj.user_email = obj.user_id?.email || null;
        obj.movie_title = obj.show_id?.movie_id?.title || null;
        obj.show_time = obj.show_id?.show_time || null;
        obj.theater_name = obj.show_id?.theater_id?.name || null;
        return obj;
    });
};

bookingSchema.statics.findByIdPopulated = async function (id) {
    const booking = await this.findById(id)
        .populate('user_id', 'name email')
        .populate({
            path: 'show_id',
            populate: [
                { path: 'movie_id', select: 'title' },
                { path: 'theater_id', select: 'name' },
            ],
        });

    if (!booking) return null;

    const obj = booking.toObject();
    obj.user_name = obj.user_id?.name || null;
    obj.user_email = obj.user_id?.email || null;
    obj.movie_title = obj.show_id?.movie_id?.title || null;
    obj.show_time = obj.show_id?.show_time || null;
    obj.theater_name = obj.show_id?.theater_id?.name || null;
    return obj;
};

bookingSchema.statics.findByUser = async function (userId) {
    const bookings = await this.find({ user_id: userId })
        .populate({
            path: 'show_id',
            populate: [
                { path: 'movie_id', select: 'title poster_url' },
                { path: 'theater_id', select: 'name' },
            ],
        })
        .sort({ created_at: -1 });

    return bookings.map((b) => {
        const obj = b.toObject();
        obj.movie_title = obj.show_id?.movie_id?.title || null;
        obj.poster_url = obj.show_id?.movie_id?.poster_url || null;
        obj.show_time = obj.show_id?.show_time || null;
        obj.theater_name = obj.show_id?.theater_id?.name || null;
        return obj;
    });
};

bookingSchema.statics.createBooking = async function ({ user_id, show_id, seat_ids, total_price }) {
    const Show = mongoose.model('Show');
    const Seat = mongoose.model('Seat');

    const uniqueSeatIds = [...new Set((seat_ids || []).map(String))];
    if (uniqueSeatIds.length !== (seat_ids || []).length) {
        const error = new Error('Duplicate seats are not allowed');
        error.status = 400;
        throw error;
    }

    if (!mongoose.isValidObjectId(show_id) || uniqueSeatIds.some((id) => !mongoose.isValidObjectId(id))) {
        const error = new Error('Show ID and seat IDs must be valid MongoDB ObjectIds');
        error.status = 400;
        throw error;
    }

    const show = await Show.findById(show_id).select('theater_id');
    if (!show) {
        const error = new Error('Show not found');
        error.status = 404;
        throw error;
    }

    const seats = await Seat.find({
        _id: { $in: uniqueSeatIds },
        theater_id: show.theater_id,
    }).select('_id row_label seat_number');

    if (seats.length !== uniqueSeatIds.length) {
        const error = new Error('One or more selected seats do not belong to this show theater');
        error.status = 400;
        throw error;
    }

    const existingBooking = await this.findOne({
        show_id,
        status: { $ne: 'cancelled' },
        seats: { $in: uniqueSeatIds },
    }).populate('seats', 'row_label seat_number');

    if (existingBooking) {
        const selected = new Set(uniqueSeatIds);
        const labels = existingBooking.seats
            .filter((seat) => selected.has(String(seat._id)))
            .map((seat) => `${seat.row_label}${seat.seat_number}`)
            .join(', ');
        const error = new Error(`Selected seat(s) already booked${labels ? `: ${labels}` : ''}`);
        error.status = 409;
        throw error;
    }

    return this.create({
        user_id,
        show_id,
        seats: uniqueSeatIds,
        total_price,
        status: 'pending',
    });
};

bookingSchema.statics.updateStatus = async function (id, status) {
    return this.findByIdAndUpdate(id, { status }, { new: true });
};

bookingSchema.statics.getBookingSeats = async function (bookingId) {
    const booking = await this.findById(bookingId).populate('seats');
    if (!booking) return [];

    return booking.seats.map((s) => ({
        row_label: s.row_label,
        seat_number: s.seat_number,
        seat_type: s.seat_type,
    }));
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
