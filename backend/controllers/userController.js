/**
 * User Controller - Handles auth and user management
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

    // GET /api/users (admin)
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
};

module.exports = userController;
