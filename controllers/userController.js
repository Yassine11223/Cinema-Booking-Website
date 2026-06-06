/**
 * User Controller - Handles auth and user management
 * Tracks login_count and last_login on every successful login
 * Supports customer, admin, and super_admin roles
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { generateOTP } = require('../backend/utils/otp');
const { sendOTPEmail } = require('../backend/utils/email');

function removeSensitiveUserFields(user) {
    if (!user) return null;

    const plainUser = user.toJSON ? user.toJSON() : user;
    const {
        password,
        otp_code,
        otp_expires_at,
        google_id,
        ...safeUser
    } = plainUser;

    return safeUser;
}

function isAdminRole(role) {
    return role === 'admin' || role === 'super_admin' || role === 'superadmin';
}

const userController = {
    // POST /api/users/register
    async register(req, res, next) {
        try {
            const { name, email, password, phone } = req.body;

            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(409).json({ message: 'Email already registered' });
            }

            const user = await User.create({ name, email, password, phone });
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

            const otpCode = generateOTP();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await User.setOTP(user.id, otpCode, expiresAt);
            await sendOTPEmail(user.email, user.name, otpCode);

            res.json({
                otpRequired: true,
                email: user.email,
                message: 'Verification code sent to your email.',
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

            if (isAdminRole(user.role)) {
                return res.status(403).json({
                    message: 'Please use the admin login portal to sign in.',
                });
            }

            const otpCode = generateOTP();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await User.setOTP(user.id, otpCode, expiresAt);
            await sendOTPEmail(user.email, user.name, otpCode);

            res.json({
                otpRequired: true,
                email: user.email,
                message: 'Verification code sent to your email.',
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

            if (!isAdminRole(user.role)) {
                return res.status(403).json({
                    message: 'Access denied. This portal is for administrators only.',
                });
            }

            const freshUser = await User.recordLogin(user.id);
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

            await User.clearOTP(user.id);
            await User.recordLogin(user.id);

            const token = generateToken(user);

            res.json({
                user: removeSensitiveUserFields(user),
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

            if (isAdminRole(user.role)) {
                return res.redirect(`${frontendUrl}/login.html?google=admin_blocked`);
            }

            await User.recordLogin(user.id);

            const freshUser = await User.findById(user.id);
            const token = generateToken(freshUser || user);
            const safeUser = removeSensitiveUserFields(freshUser || user);

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
            const user = await User.update(req.user.id, { name, phone });

            res.json(removeSensitiveUserFields(user));
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

            if (isAdminRole(user.role) && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    message: 'Only Super Admins can delete admin accounts.',
                });
            }

            await User.delete(id);

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

            if (!['customer', 'admin', 'super_admin', 'superadmin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }

            const normalizedRole = role === 'superadmin' ? 'super_admin' : role;

            if ((normalizedRole === 'super_admin' || normalizedRole === 'admin') && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    message: 'Only Super Admins can manage admin roles.',
                });
            }

            const user = await User.update(id, { role: normalizedRole });

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

            const user = await User.create({
                name,
                email,
                password,
                phone,
                role: 'admin',
            });

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
