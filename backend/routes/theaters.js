/**
 * Theater Routes
 */

const express = require('express');
const router = express.Router();
const theaterController = require('../controllers/theaterController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', theaterController.getAll);
router.get('/:id', theaterController.getById);
router.get('/:id/seats', theaterController.getSeats);
router.post('/', authenticate, adminOnly, theaterController.create);
router.put('/:id', authenticate, adminOnly, theaterController.update);
router.delete('/:id', authenticate, adminOnly, theaterController.delete);

module.exports = router;
