/**
 * Chatbot Booking Controller - TMDB-first movie source.
 */

const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const { getHomepageNowPlayingMovies, getMovieDetails, posterUrl, genreFromDetails } = require('../utils/tmdbMovieSource');

const NO_SHOWTIMES_MESSAGE = 'This movie is showing on the site, but I cannot see available showtimes for it right now.';

async function resolveOrCreateLocalMovie(tmdbId) {
    let localMovie = await Movie.findByTmdbId(tmdbId);
    if (localMovie) return localMovie;

    const details = await getMovieDetails(tmdbId);
    return Movie.upsertFromTmdb({
        tmdb_id: details.id,
        title: details.title,
        description: details.overview || '',
        poster_url: posterUrl(details.poster_path),
        genre: genreFromDetails(details, []),
        duration: details.runtime || 0,
        rating: details.vote_average ? String(Number(details.vote_average).toFixed(1)) : 'NR',
        release_date: details.release_date || null,
    });
}

async function handleBookingChat(req, res) {
    try {
        const { action, movieId, showId, date } = req.body;

        if (!action) {
            return res.status(400).json({
                reply: 'Missing action. Please specify what you need help with!',
                type: 'error',
            });
        }

        switch (action) {
            case 'get_movies':
                return handleGetMovies(res);
            case 'get_shows':
                return handleGetShows(res, movieId, date);
            case 'get_seats':
                return handleGetSeats(res, showId);
            default:
                return res.status(400).json({
                    reply: `Unknown action: ${action}`,
                    type: 'error',
                });
        }
    } catch (err) {
        console.error('Chatbot booking error:', err.message);
        return res.status(500).json({
            reply: 'Something went wrong while looking up booking info. Please try again!',
            type: 'error',
        });
    }
}

async function handleGetMovies(res) {
    const tmdbMovies = await getHomepageNowPlayingMovies();
    const localMovies = await Promise.all(tmdbMovies.map((movie) => Movie.upsertFromTmdb(movie)));

    if (!tmdbMovies.length) {
        return res.json({
            reply: "I don't see any movies showing right now. Please check back later!",
            type: 'no_movies',
            data: [],
            buttons: [],
        });
    }

    const movies = tmdbMovies.map((movie, index) => ({
        ...movie,
        id: String(movie.tmdb_id),
        local_id: localMovies[index]?.id,
    }));

    const buttons = movies.map((m) => ({
        type: 'movie_option',
        label: m.title,
        movieId: String(m.tmdb_id),
        localMovieId: m.local_id,
        tmdb_id: m.tmdb_id,
        posterUrl: m.poster_url,
        genre: m.genre,
        duration: m.duration || 0,
        rating: m.rating || '',
    }));

    const movieList = movies
        .map((m, i) => `${i + 1}. **${m.title}**${m.genre ? ` (${m.genre})` : ''}`)
        .join('\n');

    return res.json({
        reply: `Here are the movies currently showing:\n\n${movieList}\n\nTap a movie to see available showtimes!`,
        type: 'movies_list',
        data: movies,
        buttons,
    });
}

async function handleGetShows(res, movieId, date) {
    if (!movieId) {
        return res.status(400).json({
            reply: 'Please select a movie first so I can look up showtimes!',
            type: 'error',
        });
    }

    const localMovie = await resolveOrCreateLocalMovie(movieId);
    let shows = await Show.findAll({ movieId: localMovie.id, date });

    if (!date) {
        const now = new Date();
        shows = shows.filter((s) => new Date(s.show_time) > now);
    }

    if (!shows.length) {
        return res.json({
            reply: NO_SHOWTIMES_MESSAGE,
            type: 'no_shows',
            data: [],
            buttons: [],
        });
    }

    const buttons = shows.map((s) => {
        const dt = new Date(s.show_time);
        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return {
            type: 'show_option',
            label: `${timeStr} - ${s.theater_name || 'Hall'}`,
            sublabel: dateStr,
            showId: String(s.id),
            movieId: String(localMovie.tmdb_id),
            localMovieId: String(localMovie.id),
            theaterName: s.theater_name || 'Hall',
            price: s.price,
        };
    });

    const showList = buttons
        .map((b, i) => `${i + 1}. **${b.label}** - ${b.sublabel} (${b.price} EGP)`)
        .join('\n');

    return res.json({
        reply: `Showtimes for **${localMovie.title}**:\n\n${showList}\n\nTap a showtime to continue booking!`,
        type: 'shows_list',
        data: shows.map((s) => ({
            id: String(s.id),
            movie_id: String(localMovie.id),
            tmdb_id: localMovie.tmdb_id,
            movie_title: localMovie.title,
            theater_name: s.theater_name,
            show_time: s.show_time,
            price: s.price,
        })),
        buttons,
    });
}

async function handleGetSeats(res, showId) {
    if (!showId) {
        return res.status(400).json({
            reply: 'Please select a showtime first!',
            type: 'error',
        });
    }

    const show = await Show.findById(showId);
    if (!show) {
        return res.json({
            reply: "I couldn't find that showtime. It may have been removed. Please try again!",
            type: 'error',
        });
    }

    const availableSeats = await Seat.findAvailableByShow(showId);
    const availableCount = availableSeats.length;
    const dt = new Date(show.show_time);
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const movie = await Movie.findById(show.movie_id);
    const movieIdForFrontend = movie?.tmdb_id || show.movie_id;
    const movieDuration = movie?.duration ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m` : '';

    const reply = availableCount > 0
        ? `**${show.movie_title}** - ${timeStr}, ${dateStr}\n${show.theater_name || 'Hall'}\n**${availableCount} seats** available\n${show.price || 0} EGP per seat\n\nReady to pick your seats? Tap **Continue Booking** below!`
        : 'Unfortunately, all seats are booked for this showtime. Please try a different time!';

    const buttons = availableCount > 0
        ? [{
            type: 'continue_booking',
            label: 'Continue Booking',
            movieId: String(movieIdForFrontend),
            localMovieId: String(show.movie_id),
            showId: String(showId),
            movieTitle: show.movie_title || movie?.title || 'Movie',
            movieDuration,
            theaterName: show.theater_name || '',
            showTime: timeStr,
            showDate: dateStr,
            price: show.price || 0,
        }]
        : [];

    return res.json({
        reply,
        type: availableCount > 0 ? 'booking_ready' : 'no_seats',
        data: {
            showId,
            movieId: String(movieIdForFrontend),
            localMovieId: String(show.movie_id),
            movieTitle: show.movie_title,
            theaterName: show.theater_name,
            showTime: show.show_time,
            availableSeats: availableCount,
            price: show.price,
        },
        buttons,
    });
}

async function getShowtimesReplyForTmdbMovie(tmdbId) {
    const localMovie = await resolveOrCreateLocalMovie(tmdbId);
    let shows = await Show.findAll({ movieId: localMovie.id });
    const now = new Date();
    shows = shows.filter((s) => new Date(s.show_time) > now);

    if (!shows.length) {
        return {
            reply: NO_SHOWTIMES_MESSAGE,
            type: 'no_shows',
            suggestions: ['Book a ticket', 'Movies showing now'],
            source: 'database',
        };
    }

    const showList = shows.slice(0, 8).map((s, i) => {
        const dt = new Date(s.show_time);
        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `${i + 1}. ${timeStr} - ${dateStr}${s.theater_name ? ` - ${s.theater_name}` : ''}`;
    }).join('\n');

    return {
        reply: `Showtimes for **${localMovie.title}**:\n\n${showList}`,
        type: 'showtime_help',
        suggestions: ['Book this movie', 'Help me choose seats'],
        source: 'database',
    };
}

module.exports = {
    handleBookingChat,
    getShowtimesReplyForTmdbMovie,
    NO_SHOWTIMES_MESSAGE,
};
