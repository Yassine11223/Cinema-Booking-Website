/**
 * User Routes
 * Includes admin routes for delete and role management
 * Includes superadmin route for creating admin accounts
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, adminOnly, superAdminOnly } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

router.post('/register', validateRegistration, userController.register);
router.post('/login',    validateLogin,        userController.login);
router.post('/login/customer', validateLogin,  userController.loginCustomer);
router.post('/login/admin',    validateLogin,  userController.loginAdmin);
router.post('/verify-otp',                     userController.verifyOTP);
router.get('/profile',   authenticate,         userController.getProfile);
router.put('/profile',   authenticate,         userController.updateProfile);

// Admin-only routes (admin + superadmin)
router.get('/',                authenticate, adminOnly, userController.getAll);
router.delete('/:id',          authenticate, adminOnly, userController.deleteUser);
router.put('/:id/role',        authenticate, adminOnly, userController.updateRole);

// Superadmin-only routes
router.post('/admin/create',   authenticate, superAdminOnly, userController.createAdmin);

module.exports = router;
