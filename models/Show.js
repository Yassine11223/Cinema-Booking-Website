/**
 * Show model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');

const ShowSchema = new mongoose.Schema({
    movie_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theater_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
    show_time: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

ShowSchema.virtual('id').get(function () {
    return this._id.toString();
});

ShowSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.movie_id = ret.movie_id?.toString?.() || ret.movie_id;
        ret.theater_id = ret.theater_id?.toString?.() || ret.theater_id;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

function flattenShow(show) {
    if (!show) return null;
    const plain = typeof show.toJSON === 'function' ? show.toJSON() : { ...show };
    const movie = show.movie_id && typeof show.movie_id === 'object' ? show.movie_id : null;
    const theater = show.theater_id && typeof show.theater_id === 'object' ? show.theater_id : null;

    if (movie) {
        plain.movie_id = movie.id || movie._id?.toString();
        plain.movie_title = movie.title;
        plain.poster_url = movie.poster_url;
        plain.duration = movie.duration;
    }
    if (theater) {
        plain.theater_id = theater.id || theater._id?.toString();
        plain.theater_name = theater.name;
        plain.capacity = theater.capacity;
    }
    return plain;
}

ShowSchema.statics.findAll = async function (filters = {}) {
    const query = {};
    if (filters.movieId) query.movie_id = filters.movieId;
    if (filters.date) {
        const start = new Date(`${filters.date}T00:00:00.000Z`);
        const end = new Date(`${filters.date}T23:59:59.999Z`);
        query.show_time = { $gte: start, $lte: end };
    }

    const shows = await this.find(query)
        .populate('movie_id')
        .populate('theater_id')
        .sort({ show_time: 1 });

    return shows.map(flattenShow);
};

ShowSchema.statics.findDetailedById = async function (id) {
    const show = await this.findById(id).populate('movie_id').populate('theater_id');
    return flattenShow(show);
};

ShowSchema.statics.update = function (id, fields) {
    return this.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
};

ShowSchema.statics.delete = function (id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Show', ShowSchema);
