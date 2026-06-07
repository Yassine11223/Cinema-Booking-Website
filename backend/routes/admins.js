const express = require('express');
const router = express.Router();
const { authenticate, superAdminOnly } = require('../middleware/auth');
const User = require('../models/User');

function safeUser(user) {
    const plain = user?.toObject ? user.toObject({ virtuals: true }) : { ...user };
    delete plain.password;
    delete plain.otp_code;
    delete plain.otp_expires_at;
    delete plain.google_id;
    delete plain.__v;

    if (plain.role === 'superadmin') plain.role = 'super_admin';
    return plain;
}

router.get('/', authenticate, superAdminOnly, async (_req, res, next) => {
    try {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).sort({ created_at: -1 });
        res.json(admins.map(safeUser));
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticate, superAdminOnly, async (req, res, next) => {
    try {
        const { name, email, password, phone, role = 'admin' } = req.body;
        if (!name || !email || !password || password.length < 6) {
            return res.status(400).json({ message: 'Name, email, and a 6+ character password are required.' });
        }

        if (!['admin', 'super_admin', 'superadmin'].includes(role)) {
            return res.status(400).json({ message: 'Role must be Admin or Super Admin.' });
        }

        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        const admin = await User.create({
            name,
            email,
            password,
            phone: phone || null,
            role: role === 'super_admin' ? 'superadmin' : role,
        });

        res.status(201).json({
            user: safeUser(admin),
            message: 'Administrator account created successfully.',
        });
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
        if (!target || !['admin', 'superadmin'].includes(target.role)) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
