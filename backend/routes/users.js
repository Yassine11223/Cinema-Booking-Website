/**
 * User Routes
 * Includes auth, 2-step verification, newsletter, admin, and staff routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, adminOnly, staffOnly } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// --- Auth Routes ---
router.post('/register', validateRegistration, userController.register);
router.post('/login',    validateLogin,        userController.login);

// --- 2-Step Verification ---
router.post('/verify-otp',  userController.verifyLoginOTP);
router.post('/resend-otp',  userController.resendOTP);

// --- User Profile ---
router.get('/profile',   authenticate,         userController.getProfile);
router.put('/profile',   authenticate,         userController.updateProfile);

// --- Newsletter ---
router.post('/newsletter/subscribe',    authenticate, userController.subscribeNewsletter);
router.post('/newsletter/unsubscribe',  authenticate, userController.unsubscribeNewsletter);
router.post('/newsletter/send',         authenticate, adminOnly, userController.sendNewsletter);

// --- Staff Routes ---
router.get('/staff/dashboard', authenticate, staffOnly, userController.getStaffDashboard);

// --- Admin-only Routes ---
router.get('/',                authenticate, adminOnly, userController.getAll);
router.delete('/:id',          authenticate, adminOnly, userController.deleteUser);
router.put('/:id/role',        authenticate, adminOnly, userController.updateRole);

module.exports = router;
