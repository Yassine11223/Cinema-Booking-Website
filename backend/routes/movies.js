/**
 * Movie Routes
 * Includes TMDB search + import endpoints for admin panel
 * Uses optional auth for development — admin can manage without login
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { optionalAuth, optionalAdminOnly } = require('../middleware/optionalAuth');
const axios = require('axios');

// ---- Public ----
router.get('/', movieController.getAll);

// TMDB: Search movies by query (admin use) — MUST come before /:id
router.get('/tmdb/search', optionalAuth, optionalAdminOnly, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Query required' });

        const TMDB_API_KEY = process.env.TMDB_API_KEY || '8b17a4f6956553f204d913b742122c1e';
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

// TMDB: Get details for a single movie by TMDB ID — MUST come before /:id
router.get('/tmdb/:tmdbId', optionalAuth, optionalAdminOnly, async (req, res) => {
    try {
        const TMDB_API_KEY = process.env.TMDB_API_KEY || '8b17a4f6956553f204d913b742122c1e';

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
            rating:       '',
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

// Poster by title (legacy route — MUST come before /:id)
router.get('/poster/:title', async (req, res) => {
    try {
        const { getMoviePoster } = require('../utils/tmdb');
        const movieData = await getMoviePoster(req.params.title);
        if (movieData) res.json(movieData);
        else res.status(404).json({ error: 'Movie not found' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie poster' });
    }
});

// /:id MUST be last among GET routes
router.get('/:id', movieController.getById);

// Admin CRUD — optional auth for development
router.post('/',      optionalAuth, optionalAdminOnly, movieController.create);
router.put('/:id',    optionalAuth, optionalAdminOnly, movieController.update);
router.delete('/:id', optionalAuth, optionalAdminOnly, movieController.delete);

module.exports = router;
