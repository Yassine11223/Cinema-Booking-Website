/**
 * Seat model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
    theater_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
    row_label: { type: String, required: true, trim: true },
    seat_number: { type: Number, required: true },
    seat_type: { type: String, default: 'standard' },
    status: { type: String, enum: ['available', 'blocked'], default: 'available' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

SeatSchema.virtual('id').get(function () {
    return this._id.toString();
});

SeatSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.theater_id = ret.theater_id?.toString?.() || ret.theater_id;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

SeatSchema.statics.findByTheater = function (theaterId) {
    return this.find({ theater_id: theaterId }).sort({ row_label: 1, seat_number: 1 });
};

SeatSchema.statics.findAvailableByShow = async function (showId) {
    const Show = require('./Show');
    const Booking = require('./Booking');

    const show = await Show.findById(showId);
    if (!show) return [];

    const bookings = await Booking.find({
        show_id: showId,
        status: { $ne: 'cancelled' },
    }).select('seat_ids');

    const bookedSeatIds = bookings.flatMap((booking) => booking.seat_ids.map((seatId) => seatId.toString()));

    return this.find({
        theater_id: show.theater_id,
        status: { $ne: 'blocked' },
        _id: { $nin: bookedSeatIds },
    }).sort({ row_label: 1, seat_number: 1 });
};

SeatSchema.statics.createBulk = function (theaterId, seats) {
    return this.insertMany(seats.map((seat) => ({
        theater_id: theaterId,
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type || 'standard',
        status: seat.status || 'available',
    })));
};

SeatSchema.statics.delete = function (id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Seat', SeatSchema);
