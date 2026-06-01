/**
 * Show Controller - Handles show/screening operations
 */

const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Movie = require('../models/Movie');

const showController = {
    // GET /api/shows
    async getAll(req, res, next) {
        try {
            let { movieId, date } = req.query;

            // If frontend sends TMDB numeric ID, convert it to MongoDB movie _id
            if (movieId && !/^[0-9a-fA-F]{24}$/.test(movieId)) {
                const movie = await Movie.findOne({
                    $or: [
                        { tmdb_id: movieId },
                        { tmdb_id: Number(movieId) }
                    ]
                });

                if (!movie) {
                    return res.status(404).json({
                        message: 'Movie not found for this TMDB ID'
                    });
                }

                movieId = movie._id.toString();
            }

            const shows = await Show.findAll({ movieId, date });
            res.json(shows);
        } catch (error) {
            next(error);
        }
    },
    // GET /api/shows/:id
    async getById(req, res, next) {
        try {
            const show = await Show.findByIdPopulated(req.params.id);
            if (!show) {
                return res.status(404).json({ message: 'Show not found' });
            }
            res.json(show);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/shows/:id/seats (available seats for a show)
    async getAvailableSeats(req, res, next) {
        try {
            const seats = await Seat.findAvailableByShow(req.params.id);
            res.json(seats);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/shows (admin)
    async create(req, res, next) {
        try {
            const show = new Show(req.body);
            await show.save();
            res.status(201).json(show);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/shows/:id (admin)
    async update(req, res, next) {
        try {
            const show = await Show.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!show) {
                return res.status(404).json({ message: 'Show not found' });
            }
            res.json(show);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/shows/:id (admin)
    async delete(req, res, next) {
        try {
            await Show.findByIdAndDelete(req.params.id);
            res.json({ message: 'Show deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = showController;
