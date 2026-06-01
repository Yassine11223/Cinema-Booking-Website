/**
 * User Controller - Handles auth and user management
 * Tracks login_count and last_login on every successful login
 * Supports customer, admin, and superadmin roles
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

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

            res.status(201).json({ user, token });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // ✅ Track the login
            await User.recordLogin(user.id);

            const token = generateToken(user);
            const { password: _, ...userWithoutPassword } = user;

            res.json({ user: userWithoutPassword, token });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login/customer — customer-only login
    async loginCustomer(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Block admin and superadmin users from customer portal
            if (user.role === 'admin' || user.role === 'superadmin') {
                return res.status(403).json({ message: 'Please use the admin login portal to sign in.' });
            }

            await User.recordLogin(user.id);
            const token = generateToken(user);
            const { password: _, ...userWithoutPassword } = user;

            res.json({ user: userWithoutPassword, token });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login/admin — admin & superadmin login
    async loginAdmin(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Block non-admin/non-superadmin users from admin portal
            if (user.role !== 'admin' && user.role !== 'superadmin') {
                return res.status(403).json({ message: 'Access denied. This portal is for administrators only.' });
            }

            await User.recordLogin(user.id);
            const token = generateToken(user);
            const { password: _, ...userWithoutPassword } = user;

            res.json({ user: userWithoutPassword, token });
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
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users  (admin)
    async getAll(req, res, next) {
        try {
            const users = await User.findAll();
            res.json(users);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/users/profile
    async updateProfile(req, res, next) {
        try {
            const { name, phone } = req.body;
            const user = await User.update(req.user.id, { name, phone });
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/users/:id  (admin)
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            await User.delete(id);
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/users/:id/role  (admin)
    async updateRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            if (!['customer', 'admin', 'superadmin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            // Only superadmin can assign superadmin role
            if (role === 'superadmin' && req.user.role !== 'superadmin') {
                return res.status(403).json({ message: 'Only super admins can assign the superadmin role.' });
            }
            const user = await User.update(id, { role });
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/admin/create  (superadmin only)
    async createAdmin(req, res, next) {
        try {
            const { name, email, password, phone } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Name, email, and password are required.' });
            }

            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(409).json({ message: 'Email already registered.' });
            }

            const user = await User.create({ name, email, password, phone, role: 'admin' });
            res.status(201).json({ user, message: 'Admin account created successfully.' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = userController;
