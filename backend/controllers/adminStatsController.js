const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const User = require('../models/User');

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const activeStatuses = ['pending', 'confirmed', 'completed'];

const adminStatsController = {
    async getSummary(req, res, next) {
        try {
            const [movies, shows, bookings, users] = await Promise.all([
                Movie.find().lean(),
                Show.find().populate('movie_id', 'title').populate('theater_id', 'name capacity').lean(),
                Booking.find()
                    .populate('user_id', 'name email')
                    .populate({
                        path: 'show_id',
                        populate: [
                            { path: 'movie_id', select: 'title' },
                            { path: 'theater_id', select: 'name capacity' },
                        ],
                    })
                    .populate('seats', 'row_label seat_number')
                    .sort({ created_at: -1 })
                    .lean(),
                User.find().select('-password -otp_code -otp_expires_at -google_id').lean(),
            ]);

            const activeBookings = bookings.filter((booking) => activeStatuses.includes(booking.status));
            const revenueBookings = bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed');
            const revenue = revenueBookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
            const bookedSeats = activeBookings.reduce((sum, booking) => sum + (booking.seats?.length || 0), 0);

            const showCapacity = shows.reduce((sum, show) => sum + Number(show.theater_id?.capacity || 0), 0);
            const occupancyPct = showCapacity > 0 ? Math.round((bookedSeats / showCapacity) * 100) : 0;

            const todayKey = new Date().toISOString().slice(0, 10);
            const showsToday = shows.filter((show) => new Date(show.show_time).toISOString().slice(0, 10) === todayKey).length;

            const monthlyMap = new Map();
            revenueBookings.forEach((booking) => {
                const date = new Date(booking.created_at);
                const key = monthNames[date.getMonth()];
                monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(booking.total_price || 0));
            });
            const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
                month,
                amount,
                current: month === monthNames[new Date().getMonth()],
            }));

            const movieCounts = new Map();
            activeBookings.forEach((booking) => {
                const title = booking.show_id?.movie_id?.title || 'Unknown Movie';
                movieCounts.set(title, (movieCounts.get(title) || 0) + 1);
            });
            const topMovies = Array.from(movieCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([title, bookingCount], index, arr) => ({
                    rank: index + 1,
                    title,
                    bookings: bookingCount,
                    pct: arr[0]?.[1] ? Math.round((bookingCount / arr[0][1]) * 100) : 0,
                }));

            const recentBookings = bookings.slice(0, 7).map((booking) => ({
                id: booking._id.toString(),
                customer: booking.user_id?.name || 'Unknown',
                movie: booking.show_id?.movie_id?.title || 'Unknown Movie',
                seats: (booking.seats || []).map((seat) => `${seat.row_label}${seat.seat_number}`),
                amount: Number(booking.total_price || 0),
                status: booking.status,
                created_at: booking.created_at,
            }));

            res.json({
                totals: {
                    movies: movies.length,
                    showtimes: shows.length,
                    showsToday,
                    bookings: bookings.length,
                    users: users.length,
                    revenue,
                    bookedSeats,
                    occupancyPct,
                },
                monthlyRevenue,
                topMovies,
                recentBookings,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = adminStatsController;
