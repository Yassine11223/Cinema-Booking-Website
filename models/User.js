/**
 * User/Admin model - MongoDB/Mongoose.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLE_VALUES = ['customer', 'admin', 'super_admin'];

function normalizeRole(role) {
    return role === 'superadmin' ? 'super_admin' : role;
}

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    phone: { type: String, trim: true },
    role: {
        type: String,
        enum: ROLE_VALUES,
        default: 'customer',
        set: normalizeRole,
    },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    google_id: { type: String },
    avatar: { type: String, default: null },
    profileSetupCompleted: { type: Boolean, default: false },
    otp_code: { type: String },
    otp_expires_at: { type: Date },
    last_login: { type: Date },
    login_count: { type: Number, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserSchema.virtual('id').get(function () {
    return this._id.toString();
});

UserSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.otp_code;
        delete ret.otp_expires_at;
        delete ret.google_id;
        return ret;
    },
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

UserSchema.statics.findAll = async function () {
    return this.find({}).sort({ created_at: -1 });
};

UserSchema.statics.findByEmail = async function (email) {
    return this.findOne({ email: String(email || '').toLowerCase() });
};

UserSchema.statics.update = async function (id, fields) {
    const updates = { ...fields };
    if (updates.role) updates.role = normalizeRole(updates.role);
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 12);
    return this.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
};

UserSchema.statics.delete = async function (id) {
    return this.findByIdAndDelete(id);
};

UserSchema.statics.recordLogin = async function (id) {
    return this.findByIdAndUpdate(
        id,
        { $set: { last_login: new Date() }, $inc: { login_count: 1 } },
        { new: true }
    );
};

UserSchema.statics.setOTP = async function (id, otpCode, expiresAt) {
    return this.findByIdAndUpdate(
        id,
        { otp_code: otpCode, otp_expires_at: expiresAt },
        { new: true }
    );
};

UserSchema.statics.clearOTP = async function (id) {
    return this.findByIdAndUpdate(
        id,
        { $unset: { otp_code: '', otp_expires_at: '' } },
        { new: true }
    );
};

UserSchema.statics.comparePassword = async function (plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = mongoose.model('User', UserSchema);
