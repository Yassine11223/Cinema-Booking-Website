/**
 * Super Admin-only admin account management routes.
 */

const express = require('express');
const router = express.Router();
const { authenticate, superAdminOnly } = require('../middleware/auth');
const User = require('../models/User');

function safeUser(user) {
    const plain = user?.toJSON ? user.toJSON() : { ...user };
    delete plain.password;
    delete plain.otp_code;
    delete plain.otp_expires_at;
    return plain;
}

router.get('/', authenticate, superAdminOnly, async (_req, res, next) => {
    try {
        const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).sort({ created_at: -1 });
        res.json(admins.map(safeUser));
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticate, superAdminOnly, async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        const admin = await User.create({ name, email, password, phone, role: 'admin' });
        res.status(201).json({ user: safeUser(admin), message: 'Admin account created successfully.' });
    } catch (error) {
        next(error);
    }
});

router.put('/:id', authenticate, superAdminOnly, async (req, res, next) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target || !['admin', 'super_admin'].includes(target.role)) {
            return res.status(404).json({ message: 'Admin not found.' });
        }
        if (target.role === 'super_admin') {
            return res.status(403).json({ message: 'Super Admin accounts cannot be edited from the dashboard.' });
        }

        const allowed = ['name', 'email', 'phone', 'status'];
        const updates = {};
        allowed.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const admin = await User.update(req.params.id, updates);
        res.json(safeUser(admin));
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', authenticate, superAdminOnly, async (req, res, next) => {
    try {
        if (String(req.params.id) === String(req.user.id)) {
            return res.status(400).json({ message: 'You cannot delete your own admin account.' });
        }

        const target = await User.findById(req.params.id);
        if (!target || !['admin', 'super_admin'].includes(target.role)) {
            return res.status(404).json({ message: 'Admin not found.' });
        }
        if (target.role === 'super_admin') {
            return res.status(403).json({ message: 'Super Admin accounts cannot be deleted from the dashboard.' });
        }

        await User.delete(req.params.id);
        res.json({ message: 'Admin deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
