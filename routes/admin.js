/**
 * Admin analytics/report routes.
 */

const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

const Movie = require('../models/Movie');
const User = require('../models/User');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');

function monthKey(date) {
    return new Date(date).toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

function safeUser(user) {
    const plain = user?.toJSON ? user.toJSON() : { ...user };
    delete plain.password;
    delete plain.otp_code;
    delete plain.otp_expires_at;
    return plain;
}

async function buildAdminData() {
    const [movies, users, shows, bookings, seats] = await Promise.all([
        Movie.findAll(),
        User.findAll(),
        Show.findAll(),
        Booking.findAll(),
        Seat.find({}),
    ]);

    const customerUsers = users.filter((user) => user.role === 'customer');
    const activeBookings = bookings.filter((booking) => booking.status !== 'cancelled');
    const revenueBookings = bookings.filter((booking) => ['confirmed', 'completed'].includes(booking.status));
    const revenue = revenueBookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);

    const topMovieMap = new Map();
    activeBookings.forEach((booking) => {
        const title = booking.movie_title || 'Unknown movie';
        topMovieMap.set(title, (topMovieMap.get(title) || 0) + 1);
    });
    const topMovies = Array.from(topMovieMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, count], index, arr) => ({
            rank: index + 1,
            title,
            bookings: count,
            pct: arr[0] ? Math.round((count / arr[0][1]) * 100) : 0,
        }));

    const monthlyMap = new Map();
    revenueBookings.forEach((booking) => {
        const key = monthKey(booking.created_at);
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(booking.total_price || 0));
    });
    const currentMonth = monthKey(new Date());
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
        month,
        amount,
        current: month === currentMonth,
    }));

    const bookedSeats = activeBookings.reduce((sum, booking) => sum + (booking.seat_ids?.length || 0), 0);
    const occupancyPct = seats.length ? Math.round((bookedSeats / seats.length) * 100) : 0;

    return {
        stats: {
            totalMovies: movies.length,
            totalUsers: customerUsers.length,
            totalBookings: bookings.length,
            totalShows: shows.length,
            totalRevenue: revenue,
            totalSeats: seats.length,
            bookedSeats,
            occupancyPct,
        },
        recentBookings: bookings.slice(0, 10),
        topMovies,
        monthlyRevenue,
        movies,
        users: users.map(safeUser),
        shows,
        bookings,
    };
}

router.get('/dashboard', authenticate, adminOnly, async (_req, res, next) => {
    try {
        res.json(await buildAdminData());
    } catch (error) {
        next(error);
    }
});

router.get('/reports', authenticate, adminOnly, async (_req, res, next) => {
    try {
        const data = await buildAdminData();
        res.json({
            generated_at: new Date().toISOString(),
            summary: data.stats,
            monthlyRevenue: data.monthlyRevenue,
            topMovies: data.topMovies,
            bookings: data.bookings,
            movies: data.movies,
            users: data.users,
            shows: data.shows,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
