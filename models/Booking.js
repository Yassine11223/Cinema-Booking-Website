/**
 * Booking model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seat_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true }],
    total_price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

BookingSchema.virtual('id').get(function () {
    return this._id.toString();
});

BookingSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.user_id = ret.user_id?.toString?.() || ret.user_id;
        ret.show_id = ret.show_id?.toString?.() || ret.show_id;
        ret.seat_ids = (ret.seat_ids || []).map((seatId) => seatId?.toString?.() || seatId);
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

function seatLabel(seat) {
    if (!seat) return '';
    return `${seat.row_label}${seat.seat_number}`;
}

function flattenBooking(booking) {
    if (!booking) return null;
    const plain = typeof booking.toJSON === 'function' ? booking.toJSON() : { ...booking };
    const user = booking.user_id && typeof booking.user_id === 'object' ? booking.user_id : null;
    const show = booking.show_id && typeof booking.show_id === 'object' ? booking.show_id : null;
    const movie = show?.movie_id && typeof show.movie_id === 'object' ? show.movie_id : null;
    const theater = show?.theater_id && typeof show.theater_id === 'object' ? show.theater_id : null;
    const seats = Array.isArray(booking.seat_ids) ? booking.seat_ids : [];

    if (user) {
        plain.user_id = user.id || user._id?.toString();
        plain.user_name = user.name;
        plain.user_email = user.email;
    }
    if (show) {
        plain.show_id = show.id || show._id?.toString();
        plain.show_time = show.show_time;
        plain.price = show.price;
    }
    if (movie) {
        plain.movie_title = movie.title;
        plain.poster_url = movie.poster_url;
    }
    if (theater) {
        plain.theater_name = theater.name;
    }

    plain.seats = seats
        .filter((seat) => seat && typeof seat === 'object')
        .map((seat) => ({
            id: seat.id || seat._id?.toString(),
            row_label: seat.row_label,
            seat_number: seat.seat_number,
            seat_type: seat.seat_type,
            label: seatLabel(seat),
        }));
    plain.seat_labels = plain.seats.map((seat) => seat.label);

    return plain;
}

BookingSchema.statics.findAll = async function () {
    const bookings = await this.find({})
        .populate('user_id')
        .populate({
            path: 'show_id',
            populate: [{ path: 'movie_id' }, { path: 'theater_id' }],
        })
        .populate('seat_ids')
        .sort({ created_at: -1 });

    return bookings.map(flattenBooking);
};

BookingSchema.statics.findDetailedById = async function (id) {
    const booking = await this.findById(id)
        .populate('user_id')
        .populate({
            path: 'show_id',
            populate: [{ path: 'movie_id' }, { path: 'theater_id' }],
        })
        .populate('seat_ids');

    return flattenBooking(booking);
};

BookingSchema.statics.findByUser = async function (userId) {
    const bookings = await this.find({ user_id: userId })
        .populate({
            path: 'show_id',
            populate: [{ path: 'movie_id' }, { path: 'theater_id' }],
        })
        .populate('seat_ids')
        .sort({ created_at: -1 });

    return bookings.map(flattenBooking);
};

BookingSchema.statics.createBooking = async function ({ user_id, show_id, seat_ids, total_price }) {
    const existing = await this.findOne({
        show_id,
        status: { $ne: 'cancelled' },
        seat_ids: { $in: seat_ids },
    });

    if (existing) {
        const error = new Error('One or more selected seats are no longer available.');
        error.statusCode = 409;
        throw error;
    }

    return this.create({ user_id, show_id, seat_ids, total_price, status: 'pending' });
};

BookingSchema.statics.updateStatus = function (id, status) {
    return this.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
};

BookingSchema.statics.getBookingSeats = async function (bookingId) {
    const booking = await this.findById(bookingId).populate('seat_ids');
    if (!booking) return [];
    return booking.seat_ids.map((seat) => ({
        id: seat.id || seat._id?.toString(),
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type,
        label: seatLabel(seat),
    }));
};

BookingSchema.statics.delete = function (id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Booking', BookingSchema);
