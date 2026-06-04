/**
 * Movie Routes
 * MongoDB-backed movie catalog routes.
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validateMovie } = require('../middleware/validation');

router.get('/', movieController.getAll);
router.get('/:id', movieController.getById);
router.post('/', authenticate, adminOnly, validateMovie, movieController.create);
router.put('/:id', authenticate, adminOnly, movieController.update);
router.delete('/:id', authenticate, adminOnly, movieController.delete);

module.exports = router;
