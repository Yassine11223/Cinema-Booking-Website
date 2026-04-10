/**
 * Show Routes
 */

const express = require('express');
const router = express.Router();
const showController = require('../controllers/showController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', showController.getAll);
router.get('/:id', showController.getById);
router.get('/:id/seats', showController.getAvailableSeats);
router.post('/', authenticate, adminOnly, showController.create);
router.put('/:id', authenticate, adminOnly, showController.update);
router.delete('/:id', authenticate, adminOnly, showController.delete);

module.exports = router;
