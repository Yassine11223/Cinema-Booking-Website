/**
 * User Routes
 * Includes admin routes for delete and role management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

router.post('/register', validateRegistration, userController.register);
router.post('/login',    validateLogin,        userController.login);
router.get('/profile',   authenticate,         userController.getProfile);
router.put('/profile',   authenticate,         userController.updateProfile);

// Admin-only routes
router.get('/',                authenticate, adminOnly, userController.getAll);
router.delete('/:id',          authenticate, adminOnly, userController.deleteUser);
router.put('/:id/role',        authenticate, adminOnly, userController.updateRole);

module.exports = router;
