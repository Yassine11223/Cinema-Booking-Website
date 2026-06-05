/**
 * Payment model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, default: '' },
    transaction_id: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

PaymentSchema.virtual('id').get(function () {
    return this._id.toString();
});

PaymentSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.booking_id = ret.booking_id?.toString?.() || ret.booking_id;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

PaymentSchema.statics.findAll = function () {
    return this.find({}).populate('booking_id').sort({ created_at: -1 });
};

PaymentSchema.statics.findByBooking = function (bookingId) {
    return this.findOne({ booking_id: bookingId });
};

PaymentSchema.statics.updateStatus = function (id, status) {
    return this.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
};

module.exports = mongoose.model('Payment', PaymentSchema);
