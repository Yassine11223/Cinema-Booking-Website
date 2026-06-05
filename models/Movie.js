/**
 * Movie model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    genre: { type: String, default: '' },
    duration: { type: Number, required: true },
    rating: { type: String, default: '' },
    release_date: { type: Date },
    poster_url: { type: String, default: '' },
    trailer_url: { type: String, default: '' },
    status: {
        type: String,
        enum: ['now_showing', 'coming_soon', 'ended', 'Now Showing', 'Coming Soon', 'Ended'],
        default: 'now_showing',
    },
    tmdb_id: { type: Number },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

MovieSchema.virtual('id').get(function () {
    return this._id.toString();
});

MovieSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

MovieSchema.statics.findAll = function (filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.genre) query.genre = filters.genre;
    return this.find(query).sort({ release_date: -1, created_at: -1 });
};

MovieSchema.statics.update = function (id, fields) {
    return this.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
};

MovieSchema.statics.delete = function (id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Movie', MovieSchema);
