/**
 * Seat Controller - Handles show seat availability.
 */

const Seat = require('../models/Seat');

const seatController = {
    // GET /api/seats/available?showId=<showId>
    async getAvailableByShow(req, res, next) {
        try {
            const { showId } = req.query;
            if (!showId) {
                return res.status(400).json({ message: 'showId query parameter is required' });
            }

            const seats = await Seat.findAvailableByShow(showId);
            res.json(seats);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = seatController;
