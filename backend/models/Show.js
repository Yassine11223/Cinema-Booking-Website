/**
 * Show Model - Mongoose Schema
 */

const mongoose = require('mongoose');

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
        const [year, month, day] = String(filters.date).split('-').map(Number);
        const start = year && month && day
            ? new Date(year, month - 1, day, 0, 0, 0, 0)
            : new Date(filters.date);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        query.show_time = { $gte: start, $lt: end };
    }

    const Seat = mongoose.model('Seat');

    const shows = await this.find(query)
        .populate('movie_id', 'title poster_url tmdb_id release_date')
        .populate('theater_id', 'name capacity screen_type')
        .sort({ show_time: 1 })

    return Promise.all(shows.map(async (s) => {
        const obj = s.toObject();
        const availableSeats = await Seat.findAvailableByShow(s._id);
        obj.movie_title = obj.movie_id?.title || null;
        obj.tmdb_id = obj.movie_id?.tmdb_id || null;
        obj.release_date = obj.movie_id?.release_date || null;
        obj.poster_url = obj.movie_id?.poster_url || null;
        obj.theater_name = obj.theater_id?.name || null;
        obj.theater_type = obj.theater_id?.screen_type || null;
        obj.capacity = obj.theater_id?.capacity || 0;
        obj.available_seats = availableSeats.length;
        obj.sold_out = availableSeats.length === 0;
        return obj;
    }));
};

showSchema.statics.findByIdPopulated = async function (id) {
    const show = await this.findById(id)
        .populate('movie_id', 'title duration tmdb_id release_date')
        .populate('theater_id', 'name capacity screen_type');

    if (!show) return null;

    const obj = show.toObject();
    obj.movie_title = obj.movie_id?.title || null;
    obj.tmdb_id = obj.movie_id?.tmdb_id || null;
    obj.release_date = obj.movie_id?.release_date || null;
    obj.duration = obj.movie_id?.duration || null;
    obj.theater_name = obj.theater_id?.name || null;
    obj.capacity = obj.theater_id?.capacity || null;
    obj.theater_type = obj.theater_id?.screen_type || null;
    return obj;
};

const Show = mongoose.model('Show', showSchema);

module.exports = Show;
