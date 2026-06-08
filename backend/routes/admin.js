/**
 * Admins Route - Super Admin management of admin accounts
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, adminOnly } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
 
// Middleware: all routes require auth + admin
router.use(authenticate, adminOnly);
 
// GET /api/admins — list all admin/superadmin users
router.get('/', async (req, res, next) => {
    try {
        const admins = await User.find(
            { role: { $in: ['admin', 'superadmin', 'super_admin'] } },
            { password: 0 }
        ).sort({ created_at: -1 });
        res.json(admins);
    } catch (err) {
        next(err);
    }
});
 
// POST /api/admins — create a new admin account
router.post('/', async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required.' });
        }
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        const hashed = await bcrypt.hash(password, 10);
        const admin = await User.create({
            name,
            email,
            password: hashed,
            phone: phone || null,
            role: 'admin',
        });
        const { password: _, ...safe } = admin.toObject();
        res.status(201).json(safe);
    } catch (err) {
        next(err);
    }
});
 
// DELETE /api/admins/:id — delete an admin account
router.delete('/:id', async (req, res, next) => {
    try {
        const admin = await User.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });
        if (admin.role === 'superadmin' || admin.role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot delete a super admin account.' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin deleted successfully.' });
    } catch (err) {
        next(err);
    }
});
 
module.exports = router;