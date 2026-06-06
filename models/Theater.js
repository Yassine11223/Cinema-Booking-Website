/**
 * Theater model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');

const TheaterSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    screen_type: { type: String, default: 'standard' },
    branch: { type: String, default: '' },
    rows: { type: Number, default: 0 },
    seats_per_row: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    notes: { type: String, default: '' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

TheaterSchema.virtual('id').get(function () {
    return this._id.toString();
});

TheaterSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

TheaterSchema.statics.findAll = function () {
    return this.find({}).sort({ name: 1 });
};

TheaterSchema.statics.update = function (id, fields) {
    return this.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
};

TheaterSchema.statics.delete = function (id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Theater', TheaterSchema);
