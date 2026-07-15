/**
 * Show Controller - Handles show/screening operations
 */

const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const { COMING_SOON_BOOKING_MESSAGE, isComingSoonRelease } = require('../utils/movieAvailability');
const { getMovieDetails, posterUrl, genreFromDetails } = require('../utils/tmdbMovieSource');

// Price map by screen type
const PRICE_MAP = { imax: 320, standard: 180, vip: 450, dolby: 280, '3d': 250, '4dx': 350 };
const TIME_SLOTS = [
    { hour: 10, minute: 30 }, { hour: 13, minute: 0 }, { hour: 15, minute: 30 },
    { hour: 18, minute: 0 }, { hour: 20, minute: 30 }, { hour: 22, minute: 15 },
];

/**
 * Auto-generate shows for a movie across all theaters for the next 7 days.
 */
async function autoGenerateShows(movieId) {
    const theaters = await Theater.find();
    if (!theaters.length) return;

    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const newShows = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const day = new Date(today); day.setDate(day.getDate() + dayOffset);

        // Pick 2-3 random theaters
        const shuffled = [...theaters].sort(() => Math.random() - 0.5);
        const subset = shuffled.slice(0, Math.min(3, theaters.length));

        for (const theater of subset) {
            // Pick 2-3 random time slots
            const slots = [...TIME_SLOTS].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));

            for (const slot of slots) {
                const showTime = new Date(day);
                showTime.setHours(slot.hour, slot.minute, 0, 0);
                if (showTime <= now) continue;

                newShows.push({
                    movie_id: movieId,
                    theater_id: theater._id,
                    show_time: showTime,
                    price: PRICE_MAP[theater.screen_type] || 180,
                });
            }
        }
    }

    if (newShows.length > 0) {
        await Show.insertMany(newShows);
        console.log(`✅ Auto-generated ${newShows.length} shows for movie ${movieId}`);
    }
}

const showController = {
    // GET /api/shows
    async getAll(req, res, next) {
        try {
            let { movieId, date } = req.query;

            // If frontend sends TMDB numeric ID, convert it to MongoDB movie _id
            if (movieId && !/^[0-9a-fA-F]{24}$/.test(movieId)) {
                let movie = await Movie.findOne({
                    $or: [
                        { tmdb_id: movieId },
                        { tmdb_id: Number(movieId) }
                    ]
                });

                // Auto-import from TMDB if not found locally
                if (!movie) {
                    try {
                        const details = await getMovieDetails(movieId);
                        movie = await Movie.upsertFromTmdb({
                            tmdb_id: details.id,
                            title: details.title,
                            description: details.overview || '',
                            poster_url: posterUrl(details.poster_path),
                            genre: genreFromDetails(details, []),
                            duration: details.runtime || 0,
                            rating: details.vote_average ? String(Number(details.vote_average).toFixed(1)) : 'NR',
                            release_date: details.release_date || null,
                        });
                    } catch (tmdbErr) {
                        return res.json([]);
                    }

                    // Auto-generate shows for the newly imported movie
                    const existingShows = await Show.countDocuments({ movie_id: movie._id });
                    if (existingShows === 0) {
                        await autoGenerateShows(movie._id);
                    }
                }

                movieId = movie._id.toString();
            }

            // Auto-regenerate shows if movie has no future showtimes
            if (movieId) {
                const now = new Date();
                const futureShowCount = await Show.countDocuments({
                    movie_id: movieId,
                    show_time: { $gt: now },
                });

                if (futureShowCount === 0) {
                    // Clean up expired shows (keep DB tidy)
                    await Show.deleteMany({
                        movie_id: movieId,
                        show_time: { $lte: now },
                    });
                    // Generate fresh shows for the next 7 days
                    await autoGenerateShows(movieId);
                    console.log(`♻️  Auto-regenerated shows for movie ${movieId}`);
                }
            }

            const now = new Date();
            const shows = await Show.findAll({ movieId, date });
            res.json(shows.filter((show) => (
                !isComingSoonRelease(show.release_date)
                && new Date(show.show_time) > now
            )));
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
            if (isComingSoonRelease(show.release_date)) {
                return res.status(403).json({ message: COMING_SOON_BOOKING_MESSAGE });
            }
            res.json(show);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/shows/:id/seats (available seats for a show)
    async getAvailableSeats(req, res, next) {
        try {
            const show = await Show.findByIdPopulated(req.params.id);
            if (!show) {
                return res.status(404).json({ message: 'Show not found' });
            }
            if (isComingSoonRelease(show.release_date)) {
                return res.status(403).json({ message: COMING_SOON_BOOKING_MESSAGE });
            }

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
module.exports.autoGenerateShows = autoGenerateShows;
