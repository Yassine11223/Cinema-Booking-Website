/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

router.post('/register', validateRegistration, userController.register);
router.post('/login', validateLogin, userController.login);
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.get('/', authenticate, adminOnly, userController.getAll);

module.exports = router;
