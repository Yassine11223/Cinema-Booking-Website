/**
 * Movie Controller - Handles movie CRUD operations
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
            const movie = await Movie.create(req.body);
            res.status(201).json(movie);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/movies/:id (admin)
    async update(req, res, next) {
        try {
            const movie = await Movie.update(req.params.id, req.body);
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
            await Movie.delete(req.params.id);
            res.json({ message: 'Movie deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = movieController;
