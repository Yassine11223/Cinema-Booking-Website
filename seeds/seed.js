/**
 * Safe MongoDB Seeder - Cinema source-of-truth data.
 *
 * Usage: npm run seed
 *
 * This script is idempotent:
 * - upserts theaters by name
 * - upserts seats by theater/row/number
 * - upserts current TMDB now-playing movies by tmdb_id
 * - upserts shows by movie/theater/show_time
 *
 * It does not delete users, bookings, payments, or existing data.
 */

require('dotenv').config();
const { connectDB, mongoose } = require('../config/database');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Seat = require('../models/Seat');
const Show = require('../models/Show');
const { getHomepageNowPlayingMovies } = require('../utils/tmdbMovieSource');

const DAY_COUNT = Number(process.env.SEED_SHOW_DAYS || 7);

const THEATERS = [
    {
        name: 'IMAX Theatre',
        screen_type: 'imax',
        price: 320,
        rows: { A: 25, B: 27, C: 27, D: 27, E: 27, F: 27, G: 27, H: 27, J: 27, K: 27, L: 23, M: 23, N: 19, P: 15 },
        premiumRows: ['L', 'M', 'N', 'P'],
    },
    {
        name: 'Dolby Atmos',
        screen_type: 'standard',
        price: 280,
        rows: { A: 22, B: 24, C: 24, D: 24, E: 24, F: 24, G: 24, H: 24, J: 24, K: 19, L: 19, M: 16 },
        premiumRows: ['K', 'L', 'M'],
    },
    {
        name: 'Hall 1',
        screen_type: 'standard',
        price: 180,
        rows: { A: 18, B: 21, C: 21, D: 21, E: 21, F: 21, G: 21, H: 21, J: 16, K: 16, L: 13 },
        premiumRows: ['J', 'K', 'L'],
    },
    {
        name: 'Hall 3',
        screen_type: 'standard',
        price: 180,
        rows: { A: 18, B: 21, C: 21, D: 21, E: 21, F: 21, G: 21, H: 21, J: 16, K: 16, L: 13 },
        premiumRows: ['J', 'K', 'L'],
    },
    {
        name: 'Deluxe Suite',
        screen_type: 'vip',
        price: 250,
        rows: { A: 14, B: 17, C: 17, D: 17, E: 17, F: 17, G: 13, H: 13 },
        premiumRows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    },
];

const SHOWTIME_GROUPS = [
    { theater: 'IMAX Theatre', times: ['12:00', '15:30', '19:00', '22:15'] },
    { theater: 'Dolby Atmos', times: ['11:00', '14:00', '17:30', '21:00'] },
    { theater: 'Hall 1', times: ['11:30', '14:15', '20:30'] },
    { theater: 'Hall 3', times: ['17:00'] },
    { theater: 'Deluxe Suite', times: ['13:00', '16:30', '19:45'] },
];

function capacityFor(rows) {
    return Object.values(rows).reduce((sum, count) => sum + count, 0);
}

function showDate(dayOffset, time) {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

async function upsertTheatersAndSeats() {
    const theatersByName = new Map();

    for (const config of THEATERS) {
        const theater = await Theater.findOneAndUpdate(
            { name: config.name },
            {
                $set: {
                    name: config.name,
                    screen_type: config.screen_type,
                    capacity: capacityFor(config.rows),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        theatersByName.set(config.name, { doc: theater, config });

        for (const [row_label, count] of Object.entries(config.rows)) {
            const seat_type = config.premiumRows.includes(row_label)
                ? (config.screen_type === 'vip' ? 'vip' : 'premium')
                : 'standard';

            for (let seat_number = 1; seat_number <= count; seat_number += 1) {
                await Seat.findOneAndUpdate(
                    { theater_id: theater._id, row_label, seat_number },
                    { $set: { theater_id: theater._id, row_label, seat_number, seat_type } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }
    }

    return theatersByName;
}

async function upsertMovies() {
    const tmdbMovies = await getHomepageNowPlayingMovies();
    const movies = [];

    for (const tmdbMovie of tmdbMovies) {
        movies.push(await Movie.upsertFromTmdb(tmdbMovie));
    }

    return movies;
}

async function upsertShows(movies, theatersByName) {
    let count = 0;

    for (let dayOffset = 0; dayOffset < DAY_COUNT; dayOffset += 1) {
        for (const movie of movies) {
            for (const group of SHOWTIME_GROUPS) {
                const theaterEntry = theatersByName.get(group.theater);
                if (!theaterEntry) continue;

                for (const time of group.times) {
                    const show_time = showDate(dayOffset, time);
                    await Show.findOneAndUpdate(
                        {
                            movie_id: movie._id,
                            theater_id: theaterEntry.doc._id,
                            show_time,
                        },
                        {
                            $set: {
                                movie_id: movie._id,
                                theater_id: theaterEntry.doc._id,
                                show_time,
                                price: theaterEntry.config.price,
                            },
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                    count += 1;
                }
            }
        }
    }

    return count;
}

async function seed() {
    console.log('Cinema source-of-truth seed starting...');

    try {
        await connectDB();

        const theatersByName = await upsertTheatersAndSeats();
        console.log(`Upserted ${theatersByName.size} theaters and their seats.`);

        const movies = await upsertMovies();
        console.log(`Upserted ${movies.length} TMDB now-playing movies.`);

        const showCount = await upsertShows(movies, theatersByName);
        console.log(`Upserted ${showCount} shows across ${DAY_COUNT} day(s).`);

        console.log('Seed complete. Existing bookings/users/payments were left untouched.');
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
}

seed();
