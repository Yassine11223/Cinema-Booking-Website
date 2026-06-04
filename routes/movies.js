/**
 * Movie Routes
 * Includes TMDB search + import endpoints for admin panel
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validateMovie } = require('../middleware/validation');
const { getMoviePoster, getMultipleMoviePosters } = require('../utils/tmdb');
const axios = require('axios');

// ---- Public ----
router.get('/', movieController.getAll);

// TMDB: Search movies by query (admin use – returns raw TMDB results)
router.get('/tmdb/search', authenticate, adminOnly, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Query required' });

        const TMDB_API_KEY = process.env.TMDB_API_KEY;
        if (!TMDB_API_KEY) return res.status(503).json({ error: 'TMDB not configured' });

        const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
            params: { api_key: TMDB_API_KEY, query: q, language: 'en-US', page: 1 }
        });

        const results = response.data.results.slice(0, 10).map(m => ({
            tmdb_id:      m.id,
            title:        m.title,
            overview:     m.overview,
            release_date: m.release_date,
            poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            vote_average: m.vote_average,
            genre_ids:    m.genre_ids,
        }));

        res.json(results);
    } catch (err) {
        console.error('TMDB search error:', err.message);
        res.status(500).json({ error: 'TMDB search failed' });
    }
});

// TMDB: Get details for a single movie by TMDB ID (admin import helper)
router.get('/tmdb/:tmdbId', authenticate, adminOnly, async (req, res) => {
    try {
        const TMDB_API_KEY = process.env.TMDB_API_KEY;
        if (!TMDB_API_KEY) return res.status(503).json({ error: 'TMDB not configured' });

        const detailRes = await axios.get(
            `https://api.themoviedb.org/3/movie/${req.params.tmdbId}`,
            { params: { api_key: TMDB_API_KEY, language: 'en-US' } }
        );
        const m = detailRes.data;

        // Fetch trailer
        let trailer_url = null;
        try {
            const vidRes = await axios.get(
                `https://api.themoviedb.org/3/movie/${req.params.tmdbId}/videos`,
                { params: { api_key: TMDB_API_KEY } }
            );
            const yt = vidRes.data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (yt) trailer_url = `https://www.youtube.com/watch?v=${yt.key}`;
        } catch (_) { /* no trailer is fine */ }

        res.json({
            title:        m.title,
            description:  m.overview,
            genre:        m.genres?.[0]?.name || '',
            duration:     m.runtime || 0,
            rating:       '',   // MPAA rating not in basic detail endpoint
            release_date: m.release_date,
            poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            trailer_url,
            status:       'now_showing',
        });
    } catch (err) {
        console.error('TMDB detail error:', err.message);
        res.status(500).json({ error: 'TMDB detail fetch failed' });
    }
});

// Poster by title (legacy route – keep before /:id)
router.get('/poster/:title', async (req, res) => {
    try {
        const movieData = await getMoviePoster(req.params.title);
        if (movieData) res.json(movieData);
        else res.status(404).json({ error: 'Movie not found' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie poster' });
    }
});

router.get('/:id',  movieController.getById);
router.post('/',    authenticate, adminOnly, validateMovie, movieController.create);
router.put('/:id',  authenticate, adminOnly, movieController.update);
router.delete('/:id', authenticate, adminOnly, movieController.delete);

module.exports = router;
