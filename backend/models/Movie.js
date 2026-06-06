/**
 * Movie Model - Mongoose Schema
 */

const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        tmdb_id: {
            type: Number,
            unique: true,
            sparse: true,
            index: true,
            default: null,
        },
        description: {
            type: String,
            default: null,
        },
        genre: {
            type: String,
            default: null,
            maxlength: 50,
        },
        duration: {
            type: Number,
            required: true,
        },
        rating: {
            type: String,
            default: null,
            maxlength: 10,
        },
        release_date: {
            type: Date,
            default: null,
        },
        poster_url: {
            type: String,
            default: null,
            maxlength: 500,
        },
        trailer_url: {
            type: String,
            default: null,
            maxlength: 500,
        },
        status: {
            type: String,
            enum: ['now_showing', 'coming_soon', 'ended'],
            default: 'now_showing',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

movieSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// ---- Static Methods ----

movieSchema.statics.findAll = async function (filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.genre) query.genre = filters.genre;
    return this.find(query).sort({ release_date: -1 });
};

movieSchema.statics.upsertFromTmdb = async function (movie) {
    return this.findOneAndUpdate(
        { tmdb_id: Number(movie.tmdb_id) },
        {
            $set: {
                tmdb_id: Number(movie.tmdb_id),
                title: movie.title,
                description: movie.description || '',
                genre: movie.genre || 'Movie',
                duration: movie.duration || movie.runtime || 0,
                rating: movie.rating || 'NR',
                release_date: movie.release_date || null,
                poster_url: movie.poster_url || movie.poster || null,
                status: 'now_showing',
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
