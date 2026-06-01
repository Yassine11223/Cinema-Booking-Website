/**
 * Theater Model - Mongoose Schema
 */

const mongoose = require('mongoose');

const theaterSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        capacity: {
            type: Number,
            required: true,
        },
        screen_type: {
            type: String,
            enum: ['standard', 'imax', '3d', '4dx', 'vip'],
            default: 'standard',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

theaterSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// ---- Static Methods ----

theaterSchema.statics.findAll = async function () {
    return this.find().sort({ name: 1 });
};

const Theater = mongoose.model('Theater', theaterSchema);

module.exports = Theater;
