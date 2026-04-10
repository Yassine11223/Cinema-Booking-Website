/**
 * Movie Routes
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validateMovie } = require('../middleware/validation');
const { getMoviePoster } = require('../utils/tmdb');

router.get('/', movieController.getAll);
// Add /poster/:title route BEFORE /:id to prevent :id from catching it
router.get('/poster/:title', async (req, res) => {
    try {
        const movieTitle = req.params.title;
        const movieData = await getMoviePoster(movieTitle);
        
        if (movieData) {
            res.json(movieData);
        } else {
            res.status(404).json({ error: 'Movie not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie poster' });
    }
});
router.get('/:id', movieController.getById);
router.post('/', authenticate, adminOnly, validateMovie, movieController.create);
router.put('/:id', authenticate, adminOnly, movieController.update);
router.delete('/:id', authenticate, adminOnly, movieController.delete);

module.exports = router;
