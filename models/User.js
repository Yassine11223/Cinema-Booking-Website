/**
 * User Model - Mongoose Schema
 * Includes login tracking: last_login, login_count
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 255,
        },
        password: {
            type: String,
            default: null,
        },
        phone: {
            type: String,
            default: null,
            maxlength: 20,
        },
        role: {
            type: String,
            enum: ['customer', 'admin', 'superadmin'],
            default: 'customer',
        },
        google_id: {
            type: String,
            default: null,
        },
        auth_provider: {
            type: String,
            default: 'local',
            maxlength: 50,
        },
        profile_photo: {
            type: String,
            default: null,
        },
        otp_code: {
            type: String,
            default: null,
            maxlength: 6,
        },
        otp_expires_at: {
            type: Date,
            default: null,
        },
        last_login: {
            type: Date,
            default: null,
        },
        login_count: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual 'id' that mirrors '_id' for compatibility
userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Hash password before saving (only if modified)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// ---- Static Methods (replicate the old model API) ----

userSchema.statics.findAll = async function () {
    return this.find()
        .select('-password -otp_code -otp_expires_at -google_id')
        .sort({ created_at: -1 });
};

userSchema.statics.findByEmail = async function (email) {
    return this.findOne({ email });
};

userSchema.statics.recordLogin = async function (id) {
    return this.findByIdAndUpdate(
        id,
        {
            last_login: new Date(),
            $inc: { login_count: 1 },
        },
        { new: true }
    ).select('id last_login login_count');
};

userSchema.statics.setOTP = async function (id, otpCode, expiresAt) {
    return this.findByIdAndUpdate(
        id,
        { otp_code: otpCode, otp_expires_at: expiresAt },
        { new: true }
    ).select('id email otp_code otp_expires_at');
};

userSchema.statics.comparePassword = async function (plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
