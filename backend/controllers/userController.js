/**
 * User Controller - Handles auth and user management
 * Tracks login_count and last_login on every successful login
 * Supports customer, admin, and superadmin roles
 * Supports Google login for customers
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { generateOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/email');

function removeSensitiveUserFields(user) {
    if (!user) return null;

    const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };

    delete obj.password;
    delete obj.otp_code;
    delete obj.otp_expires_at;
    delete obj.google_id;
    delete obj.__v;

    return obj;
}

const PREDEFINED_AVATARS = new Set([
    'popcorn',
    'ticket',
    'film-reel',
    'clapperboard',
    'glasses',
    'camera',
    'cinema-seat',
    'star',
]);

const userController = {
    // POST /api/users/register
    async register(req, res, next) {
        try {
            const { name, email, password, phone } = req.body;

            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(409).json({ message: 'Email already registered' });
            }

            const user = new User({ name, email, password, phone });
            await user.save();

            const token = generateToken(user);

            res.status(201).json({
                user: removeSensitiveUserFields(user),
                token,
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user || !user.password) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            await User.recordLogin(user._id);
            const freshUser = await User.findById(user._id);
            const token = generateToken(freshUser || user);

            res.json({
                user: removeSensitiveUserFields(freshUser || user),
                token,
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login/customer
    async loginCustomer(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user || !user.password) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            if (user.role === 'admin' || user.role === 'superadmin') {
                return res.status(403).json({
                    message: 'Please use the admin login portal to sign in.',
                });
            }

            await User.recordLogin(user._id);
            const freshUser = await User.findById(user._id);
            const token = generateToken(freshUser || user);

            res.json({
                user: removeSensitiveUserFields(freshUser || user),
                token,
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login/admin
    async loginAdmin(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user || !user.password) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            if (user.role !== 'admin' && user.role !== 'superadmin') {
                return res.status(403).json({
                    message: 'Access denied. This portal is for administrators only.',
                });
            }

            await User.recordLogin(user._id);
            const freshUser = await User.findById(user._id);
            const token = generateToken(freshUser || user);

            res.json({
                user: removeSensitiveUserFields(freshUser || user),
                token,
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/verify-otp
    async verifyOTP(req, res, next) {
        try {
            const { email, otpCode } = req.body;

            if (!email || !otpCode) {
                return res.status(400).json({
                    message: 'Email and verification code are required.',
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    message: 'Invalid email or verification code.',
                });
            }

            if (!user.otp_code || user.otp_code !== otpCode) {
                return res.status(401).json({
                    message: 'Invalid email or verification code.',
                });
            }

            if (new Date() > new Date(user.otp_expires_at)) {
                return res.status(401).json({
                    message: 'Verification code has expired. Please sign in again.',
                });
            }

            // Clear OTP
            await User.findByIdAndUpdate(user._id, {
                otp_code: null,
                otp_expires_at: null,
            });

            await User.recordLogin(user._id);

            const freshUser = await User.findById(user._id);
            const token = generateToken(freshUser || user);

            res.json({
                user: removeSensitiveUserFields(freshUser || user),
                token,
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users/google/callback
    async googleCallback(req, res, next) {
        try {
            const user = req.user;
            const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';

            if (!user) {
                return res.redirect(`${frontendUrl}/login.html?google=failed`);
            }

            if (user.role === 'admin' || user.role === 'superadmin') {
                return res.redirect(`${frontendUrl}/login.html?google=admin_blocked`);
            }

            await User.recordLogin(user._id);

            const freshUser = await User.findById(user._id);
            const finalUser = freshUser || user;
            const token = generateToken(finalUser);
            const safeUser = {
    id: finalUser._id,
    name: finalUser.name,
    email: finalUser.email,
    phone: finalUser.phone,
    role: finalUser.role,
    profile_photo: finalUser.profile_photo,
    auth_provider: finalUser.auth_provider,
    last_login: finalUser.last_login,
    login_count: finalUser.login_count,
};

            const redirectUrl =
                `${frontendUrl}/login.html?google=success` +
                `&token=${encodeURIComponent(token)}` +
                `&user=${encodeURIComponent(JSON.stringify(safeUser))}`;

            return res.redirect(redirectUrl);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users/profile
    async getProfile(req, res, next) {
        try {
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(removeSensitiveUserFields(user));
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users
    async getAll(req, res, next) {
        try {
            const users = await User.findAll();
            res.json(users.map(removeSensitiveUserFields));
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/users/profile
    async updateProfile(req, res, next) {
        try {
            const { name, phone } = req.body;
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { name, phone },
                { new: true }
            );

            res.json(removeSensitiveUserFields(user));
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/profile/avatar
    async updateAvatar(req, res, next) {
        console.log('Avatar update route hit');

        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.role !== 'customer') {
                return res.status(403).json({ message: 'Avatar setup is available to customers only.' });
            }

            let avatar;
            if (req.file) {
                avatar = `/uploads/avatars/${req.file.filename}`;
            } else if (PREDEFINED_AVATARS.has(req.body.predefinedAvatar)) {
                avatar = `predefined:${req.body.predefinedAvatar}`;
            } else {
                return res.status(400).json({ message: 'Choose a predefined avatar or upload an image.' });
            }

            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { avatar, profileSetupCompleted: true },
                { new: true, runValidators: true }
            );

            return res.json(removeSensitiveUserFields(updatedUser));
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/users/:id
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            await User.findByIdAndDelete(id);

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/users/:id/role
    async updateRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!['customer', 'admin', 'superadmin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }

            if (role === 'superadmin' && req.user.role !== 'superadmin') {
                return res.status(403).json({
                    message: 'Only super admins can assign the superadmin role.',
                });
            }

            const user = await User.findByIdAndUpdate(
                id,
                { role },
                { new: true }
            );

            res.json(removeSensitiveUserFields(user));
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/admin/create
    async createAdmin(req, res, next) {
        try {
            const { name, email, password, phone } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    message: 'Name, email, and password are required.',
                });
            }

            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(409).json({
                    message: 'Email already registered.',
                });
            }

            const user = new User({
                name,
                email,
                password,
                phone,
                role: 'admin',
            });
            await user.save();

            res.status(201).json({
                user: removeSensitiveUserFields(user),
                message: 'Admin account created successfully.',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = userController;
