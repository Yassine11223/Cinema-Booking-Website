/**
 * Theater Controller - Handles theater management
 */

const Theater = require('../models/Theater');
const Seat = require('../models/Seat');

const theaterController = {
    // GET /api/theaters
    async getAll(req, res, next) {
        try {
            const theaters = await Theater.findAll();
            res.json(theaters);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/theaters/:id
    async getById(req, res, next) {
        try {
            const theater = await Theater.findById(req.params.id);
            if (!theater) {
                return res.status(404).json({ message: 'Theater not found' });
            }
            res.json(theater);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/theaters/:id/seats
    async getSeats(req, res, next) {
        try {
            const seats = await Seat.findByTheater(req.params.id);
            res.json(seats);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/theaters (admin)
    async create(req, res, next) {
        try {
            const theater = new Theater(req.body);
            await theater.save();
            res.status(201).json(theater);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/theaters/:id (admin)
    async update(req, res, next) {
        try {
            const theater = await Theater.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!theater) {
                return res.status(404).json({ message: 'Theater not found' });
            }
            res.json(theater);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/theaters/:id (admin)
    async delete(req, res, next) {
        try {
            await Theater.findByIdAndDelete(req.params.id);
            res.json({ message: 'Theater deleted successfully' });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = theaterController;
