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
            const movie = await Movie.create(filterMovieFields(req.body));
            res.status(201).json(movie);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/movies/:id (admin)
    async update(req, res, next) {
        try {
            const fields = filterMovieFields(req.body);
            if (Object.keys(fields).length === 0) {
                return res.status(400).json({ message: 'No valid movie fields provided' });
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
            await Movie.delete(req.params.id);
            res.json({ message: 'Movie deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

function filterMovieFields(body) {
    const allowed = [
        'title',
        'description',
        'genre',
        'duration',
        'rating',
        'release_date',
        'poster_url',
        'trailer_url',
        'status',
    ];
    const fields = {};
    allowed.forEach(key => {
        if (body[key] !== undefined) fields[key] = body[key];
    });
    return fields;
}

module.exports = movieController;
