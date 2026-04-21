/**
 * Movie Controller - Handles movie CRUD operations
 * Provides default values for optional fields
 */

const Movie = require('../models/Movie');

const movieController = {
    // GET /api/movies
    async getAll(req, res, next) {
        try {
            const { status, genre } = req.query;
            const movies = await Movie.findAll({ status, genre });
            res.json(movies);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/movies/:id
    async getById(req, res, next) {
        try {
            const movie = await Movie.findById(req.params.id);
            if (!movie) {
                return res.status(404).json({ message: 'Movie not found' });
            }
            res.json(movie);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/movies (admin)
    async create(req, res, next) {
        try {
            const data = {
                title:        req.body.title,
                description:  req.body.description || '',
                genre:        req.body.genre || '',
                duration:     parseInt(req.body.duration) || 0,
                rating:       req.body.rating || '',
                release_date: req.body.release_date || null,
                poster_url:   req.body.poster_url || null,
                trailer_url:  req.body.trailer_url || null,
                status:       req.body.status || 'now_showing',
            };

            if (!data.title || data.title.trim().length === 0) {
                return res.status(400).json({ message: 'Movie title is required' });
            }

            const movie = await Movie.create(data);
            res.status(201).json(movie);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/movies/:id (admin)
    async update(req, res, next) {
        try {
            // Only include fields that were provided
            const allowed = ['title', 'description', 'genre', 'duration', 'rating', 'release_date', 'poster_url', 'trailer_url', 'status'];
            const fields = {};
            allowed.forEach(key => {
                if (req.body[key] !== undefined) {
                    fields[key] = req.body[key];
                }
            });

            if (Object.keys(fields).length === 0) {
                return res.status(400).json({ message: 'No fields to update' });
            }

            const movie = await Movie.update(req.params.id, fields);
            if (!movie) {
                return res.status(404).json({ message: 'Movie not found' });
            }
            res.json(movie);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/movies/:id (admin)
    async delete(req, res, next) {
        try {
            const movie = await Movie.findById(req.params.id);
            if (!movie) {
                return res.status(404).json({ message: 'Movie not found' });
            }
            await Movie.delete(req.params.id);
            res.json({ message: 'Movie deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = movieController;
