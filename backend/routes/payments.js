/**
 * Payment Routes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.post('/', authenticate, paymentController.create);
router.get('/:id', authenticate, paymentController.getById);
router.get('/', authenticate, adminOnly, paymentController.getAll);

module.exports = router;
