/**
 * User Routes
 * Includes admin routes for delete and role management
 * Uses optional auth for development
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { optionalAuth, optionalAdminOnly } = require('../middleware/optionalAuth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Public auth routes
router.post('/register', validateRegistration, userController.register);
router.post('/login',    validateLogin,        userController.login);

// Authenticated user routes
router.get('/profile',   authenticate,         userController.getProfile);
router.put('/profile',   authenticate,         userController.updateProfile);

// Admin-only routes — optional auth for development
router.get('/',                optionalAuth, optionalAdminOnly, userController.getAll);
router.delete('/:id',          optionalAuth, optionalAdminOnly, userController.deleteUser);
router.put('/:id/role',        optionalAuth, optionalAdminOnly, userController.updateRole);

module.exports = router;
