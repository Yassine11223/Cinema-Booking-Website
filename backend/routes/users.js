/**
 * User Routes
 * Includes admin routes for delete and role management
 * Includes superadmin route for creating admin accounts
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const userController = require('../controllers/userController');
const { authenticate, adminOnly, superAdminOnly } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Google Login - Customer only
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

// Google Login Callback
router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}/login.html?google=failed`,
    }),
    userController.googleCallback
);

// Public auth routes
router.post('/register', validateRegistration, userController.register);
router.post('/login', validateLogin, userController.login);
router.post('/login/customer', validateLogin, userController.loginCustomer);
router.post('/login/admin', validateLogin, userController.loginAdmin);
router.post('/verify-otp', userController.verifyOTP);

// User profile routes
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.post('/profile/avatar', authenticate, upload.single('avatar'), userController.updateAvatar);

// Admin-only routes: admin + superadmin
router.get('/', authenticate, adminOnly, userController.getAll);
router.delete('/:id', authenticate, adminOnly, userController.deleteUser);
router.put('/:id/role', authenticate, adminOnly, userController.updateRole);

// Superadmin-only routes
router.post('/admin/create', authenticate, superAdminOnly, userController.createAdmin);

module.exports = router;
