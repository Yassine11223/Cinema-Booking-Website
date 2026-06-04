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
    const booking = new this({
        user_id,
        show_id,
        seats: seat_ids,
        total_price,
        status: 'pending',
    });

    await booking.save();
    return booking;
};

bookingSchema.statics.findActiveSeatConflicts = async function (showId, seatIds) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) return [];

    return this.find({
        show_id: showId,
        status: { $ne: 'cancelled' },
        seats: { $in: seatIds },
    }).select('seats');
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
