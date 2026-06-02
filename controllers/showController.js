/**
 * Show Controller - Handles show/screening operations
 */

const Show = require('../models/Show');
const Seat = require('../models/Seat');

const showController = {
    // GET /api/shows
    async getAll(req, res, next) {
        try {
            const { movieId, date } = req.query;
            const shows = await Show.findAll({ movieId, date });
            res.json(shows);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/shows/:id
    async getById(req, res, next) {
        try {
            const show = await Show.findById(req.params.id);
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
            const { movie_id, theater_id, show_time, price } = req.body;
            if (!movie_id || !theater_id || !show_time || Number(price) <= 0) {
                return res.status(400).json({ message: 'Movie, theater, show time, and a positive price are required' });
            }
            const show = await Show.create(req.body);
            res.status(201).json(show);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/shows/:id (admin)
    async update(req, res, next) {
        try {
            const allowed = ['movie_id', 'theater_id', 'show_time', 'price'];
            const fields = {};
            allowed.forEach(key => {
                if (req.body[key] !== undefined) fields[key] = req.body[key];
            });
            if (fields.price !== undefined && Number(fields.price) <= 0) {
                return res.status(400).json({ message: 'Price must be greater than zero' });
            }
            if (Object.keys(fields).length === 0) {
                return res.status(400).json({ message: 'No valid show fields provided' });
            }
            const show = await Show.update(req.params.id, fields);
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
            await Show.delete(req.params.id);
            res.json({ message: 'Show deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = showController;
