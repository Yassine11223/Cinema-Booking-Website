/**
 * Payment Model - Mongoose Schema
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        booking_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        payment_method: {
            type: String,
            required: true,
            maxlength: 50,
        },
        transaction_id: {
            type: String,
            default: null,
            maxlength: 255,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

paymentSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Index
paymentSchema.index({ booking_id: 1 });

// ---- Static Methods ----

paymentSchema.statics.findAll = async function () {
    const payments = await this.find()
        .populate({
            path: 'booking_id',
            select: 'total_price user_id',
            populate: { path: 'user_id', select: 'name' },
        })
        .sort({ created_at: -1 });

    return payments.map((p) => {
        const obj = p.toObject();
        obj.total_price = obj.booking_id?.total_price || null;
        obj.user_name = obj.booking_id?.user_id?.name || null;
        return obj;
    });
};

paymentSchema.statics.findByBooking = async function (bookingId) {
    return this.findOne({ booking_id: bookingId });
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
