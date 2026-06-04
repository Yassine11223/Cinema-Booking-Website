/**
 * Show Model - Mongoose Schema
 */

const mongoose = require('mongoose');
const Booking = require('./Booking');

const showSchema = new mongoose.Schema(
    {
        movie_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie',
            required: true,
        },
        theater_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Theater',
            required: true,
        },
        show_time: {
            type: Date,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

showSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Indexes
showSchema.index({ movie_id: 1 });
showSchema.index({ theater_id: 1 });
showSchema.index({ show_time: 1 });

// ---- Static Methods ----

showSchema.statics.findAll = async function (filters = {}) {
    const query = {};

    if (filters.movieId) query.movie_id = filters.movieId;
    if (filters.date) {
        const d = new Date(filters.date);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        query.show_time = { $gte: d, $lt: nextDay };
    }

    const shows = await this.find(query)
        .populate('movie_id', 'title poster_url genre')
        .populate('theater_id', 'name capacity screen_type')
        .sort({ show_time: 1 });

    const bookingCounts = await Booking.aggregate([
        {
            $match: {
                show_id: { $in: shows.map((s) => s._id) },
                status: { $ne: 'cancelled' },
            },
        },
        { $project: { show_id: 1, seat_count: { $size: '$seats' } } },
        { $group: { _id: '$show_id', booked: { $sum: '$seat_count' } } },
    ]);
    const bookedByShow = new Map(bookingCounts.map((row) => [row._id.toString(), row.booked]));

    return shows.map((s) => {
        const obj = s.toObject();
        obj.movie_title = obj.movie_id?.title || null;
        obj.genre = obj.movie_id?.genre || null;
        obj.poster_url = obj.movie_id?.poster_url || null;
        obj.theater_name = obj.theater_id?.name || null;
        obj.capacity = obj.theater_id?.capacity || 0;
        obj.screen_type = obj.theater_id?.screen_type || null;
        obj.booked = bookedByShow.get(s._id.toString()) || 0;
        return obj;
    });
};

showSchema.statics.findByIdPopulated = async function (id) {
    const show = await this.findById(id)
        .populate('movie_id', 'title duration')
        .populate('theater_id', 'name capacity');

    if (!show) return null;

    const obj = show.toObject();
    obj.movie_title = obj.movie_id?.title || null;
    obj.duration = obj.movie_id?.duration || null;
    obj.theater_name = obj.theater_id?.name || null;
    obj.capacity = obj.theater_id?.capacity || null;
    return obj;
};

const Show = mongoose.model('Show', showSchema);

module.exports = Show;
