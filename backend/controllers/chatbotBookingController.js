/**
 * Chatbot Booking Controller - TMDB-first movie source.
 * MongoDB is used only as the local booking/showtime reference cache.
 */

const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Theater = require('../models/Theater');
const { COMING_SOON_BOOKING_MESSAGE, isComingSoonRelease } = require('../utils/movieAvailability');

// Maps theater screen_type to customer-facing experience name
const SCREEN_TO_EXP = {
    'imax': 'IMAX', '3d': 'IMAX',
    'dolby': 'Dolby',
    'standard': 'Standard',
    'vip': 'Deluxe', '4dx': '4DX',
};
const EXP_TO_SCREENS = {
    'IMAX': ['imax', '3d'],
    'Dolby': ['dolby'],
    'Standard': ['standard'],
    'Deluxe': ['vip'],
    '4DX': ['4dx'],
};
const { getHomepageNowPlayingMovies, getMovieDetails, posterUrl, genreFromDetails } = require('../utils/tmdbMovieSource');

const NO_SHOWTIMES_MESSAGE = 'This movie is showing on the site, but I cannot see available showtimes for it right now.';
const MOVIE_LIMIT = 12;

function comingSoonResponse(res) {
    return res.json({
        reply: COMING_SOON_BOOKING_MESSAGE,
        type: 'coming_soon',
        data: [],
        buttons: [],
    });
}

async function resolveOrCreateLocalMovie(tmdbId) {
    let movie = await Movie.findOne({
        $or: [
            { tmdb_id: tmdbId },
            { tmdb_id: Number(tmdbId) },
        ],
    });
    if (movie) return movie;

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

        const { experience, genre } = req.body;

        switch (action) {
            case 'get_movies':
                return handleGetMovies(res);
            case 'get_shows':
                return handleGetShows(res, movieId, date);
            case 'get_seats':
                return handleGetSeats(res, showId);
            case 'get_experiences':
                return handleGetExperiences(res, movieId);
            case 'get_dates':
                return handleGetDates(res, movieId, experience);
            case 'get_shows_filtered':
                return handleGetShowsFiltered(res, movieId, experience, date);
            case 'get_movies_by_genre':
                return handleGetMoviesByGenre(res, genre);
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
    return res.json(await getMoviesListReply());
}

async function findMoviesWithUpcomingShows(extraMovieQuery = {}) {
    const now = new Date();
    const activeMovieIds = await Show.find({ show_time: { $gt: now } }).distinct('movie_id');

    if (!activeMovieIds.length) return [];

    return Movie.find({
        _id: { $in: activeMovieIds },
        ...extraMovieQuery,
    }).sort({ release_date: -1 }).limit(MOVIE_LIMIT);
}

function movieButton(movie) {
    return {
        type: 'movie_option',
        label: movie.title,
        movieId: movie.tmdb_id ? String(movie.tmdb_id) : movie._id.toString(),
        localMovieId: movie._id.toString(),
        tmdb_id: movie.tmdb_id,
        posterUrl: movie.poster_url,
        genre: movie.genre,
        duration: movie.duration || 0,
        rating: movie.rating || '',
    };
}

function movieData(movie) {
    const obj = typeof movie.toObject === 'function' ? movie.toObject() : movie;
    return {
        ...obj,
        id: movie.tmdb_id ? String(movie.tmdb_id) : movie._id.toString(),
        local_id: movie._id.toString(),
    };
}

function moviesListResponse(movies, intro = 'Here are the movies currently showing') {
    if (!movies.length) {
        return {
            reply: "I don't see any movies with upcoming showtimes right now. Please check back later!",
            type: 'no_movies',
            data: [],
            buttons: [],
            source: 'database',
        };
    }

    const movieList = movies
        .map((m, i) => `${i + 1}. **${m.title}**${m.genre ? ` (${m.genre})` : ''}`)
        .join('\n');

    return {
        reply: `${intro}:\n\n${movieList}\n\nTap a movie to see available showtimes!`,
        type: 'movies_list',
        data: movies.map(movieData),
        buttons: movies.map(movieButton),
        source: 'database',
    };
}

async function getMoviesListReply() {
    const movies = await findMoviesWithUpcomingShows();
    return moviesListResponse(movies);
}

async function handleGetShows(res, movieId, date) {
    if (!movieId) {
        return res.status(400).json({
            reply: 'Please select a movie first so I can look up showtimes!',
            type: 'error',
        });
    }

    const movie = /^[0-9a-fA-F]{24}$/.test(movieId)
        ? await Movie.findById(movieId)
        : await resolveOrCreateLocalMovie(movieId);

    if (!movie) {
        return res.json({
            reply: NO_SHOWTIMES_MESSAGE,
            type: 'no_shows',
            data: [],
            buttons: [],
        });
    }

    if (isComingSoonRelease(movie.release_date)) {
        return comingSoonResponse(res);
    }

    const resolvedMovieId = movie._id.toString();
    const filters = { movieId: resolvedMovieId };
    if (date) filters.date = date;

    let shows = await Show.findAll(filters);
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
            label: `${timeStr} - ${s.theater_name || 'Hall'}${s.sold_out ? ' - Sold Out' : ''}`,
            sublabel: dateStr,
            showId: s._id.toString(),
            movieId: movie.tmdb_id ? String(movie.tmdb_id) : resolvedMovieId,
            localMovieId: resolvedMovieId,
            theaterName: s.theater_name || 'Hall',
            price: s.price,
            availableSeats: s.available_seats || 0,
            soldOut: s.sold_out === true,
        };
    });

    const showList = buttons
        .map((b, i) => `${i + 1}. **${b.label}** - ${b.sublabel} (${b.price} EGP, ${b.availableSeats} seats available)`)
        .join('\n');

    return res.json({
        reply: `Showtimes for **${movie.title}**:\n\n${showList}\n\nTap a showtime to continue booking!`,
        type: 'shows_list',
        data: shows.map((s) => ({
            id: s._id.toString(),
            movie_id: resolvedMovieId,
            tmdb_id: movie.tmdb_id || null,
            movie_title: movie.title,
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

    if (!/^[0-9a-fA-F]{24}$/.test(showId)) {
        return res.json({
            reply: "That showtime doesn't look right. Please select a valid showtime!",
            type: 'error',
        });
    }

    const show = await Show.findByIdPopulated(showId);
    if (!show) {
        return res.json({
            reply: "I couldn't find that showtime. It may have been removed. Please try again!",
            type: 'error',
        });
    }

    if (isComingSoonRelease(show.release_date)) {
        return comingSoonResponse(res);
    }

    const availableSeats = await Seat.findAvailableByShow(showId);
    const totalSeats = show.capacity || 0;
    const availableCount = availableSeats.length;

    const dt = new Date(show.show_time);
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const localMovieId = show.movie_id?._id?.toString() || show.movie_id?.toString() || '';
    const movie = localMovieId ? await Movie.findById(localMovieId) : null;

    const movieIdForFrontend = movie?.tmdb_id ? String(movie.tmdb_id) : localMovieId;
    const movieDuration = show.duration ? `${Math.floor(show.duration / 60)}h ${show.duration % 60}m` : '';

    const reply = availableCount > 0
        ? `**${show.movie_title}** - ${timeStr}, ${dateStr}\n${show.theater_name || 'Hall'}\n**${availableCount} seats** available${totalSeats ? ` out of ${totalSeats}` : ''}\n${show.price || 0} EGP per seat\n\nReady to pick your seats? Tap **Continue Booking** below!`
        : 'Unfortunately, all seats are booked for this showtime. Please try a different time!';

    const buttons = availableCount > 0
        ? [{
            type: 'continue_booking',
            label: 'Continue Booking',
            movieId: movieIdForFrontend,
            localMovieId,
            showId,
            movieTitle: show.movie_title || 'Movie',
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
            movieId: movieIdForFrontend,
            localMovieId,
            movieTitle: show.movie_title,
            theaterName: show.theater_name,
            showTime: show.show_time,
            availableSeats: availableCount,
            totalSeats,
            price: show.price,
        },
        buttons,
    });
}

async function getShowtimesReplyForTmdbMovie(tmdbId) {
    const movie = await resolveOrCreateLocalMovie(tmdbId);
    if (isComingSoonRelease(movie.release_date)) {
        return {
            reply: COMING_SOON_BOOKING_MESSAGE,
            type: 'coming_soon',
            data: [],
            buttons: [],
        };
    }
    let shows = await Show.findAll({ movieId: movie._id.toString() });
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
        reply: `Showtimes for **${movie.title}**:\n\n${showList}`,
        type: 'showtime_help',
        suggestions: ['Book this movie', 'Help me choose seats'],
        source: 'database',
    };
}

async function getGeneralShowtimesReply() {
    const now = new Date();
    const shows = await Show.find({ show_time: { $gt: now } })
        .populate('movie_id', 'title tmdb_id release_date')
        .populate('theater_id', 'name screen_type')
        .sort({ show_time: 1 })
        .limit(10);
    const bookableShows = shows.filter((show) => !isComingSoonRelease(show.movie_id?.release_date));

    if (!bookableShows.length) {
        return {
            reply: 'I cannot see any upcoming showtimes in the database right now. Please check back later or try another date.',
            type: 'no_shows',
            suggestions: ['Movies showing now', 'How do I book a ticket?'],
            buttons: [],
            source: 'database',
        };
    }

    const buttons = bookableShows.map((s) => {
        const dt = new Date(s.show_time);
        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return {
            type: 'show_option',
            label: `${timeStr} - ${s.theater_id?.name || 'Hall'}`,
            sublabel: `${dateStr} • ${s.price || 0} EGP`,
            showId: s._id.toString(),
            movieId: s.movie_id?.tmdb_id ? String(s.movie_id.tmdb_id) : s.movie_id?._id?.toString(),
            localMovieId: s.movie_id?._id?.toString(),
            movieTitle: s.movie_id?.title || 'Movie',
            theaterName: s.theater_id?.name || 'Hall',
            price: s.price || 0,
            availableSeats: null,
            soldOut: false,
        };
    });

    const showList = buttons
        .map((b, i) => `${i + 1}. **${b.movieTitle}** — ${b.label} (${b.sublabel})`)
        .join('\n');

    return {
        reply: `Here are the next available showtimes from our booking system:\n\n${showList}\n\nPick a showtime or ask for a specific movie/date.`,
        type: 'shows_list',
        suggestions: ['Book a ticket', 'Movies showing now', 'Help me choose seats'],
        buttons,
        source: 'database',
    };
}

// ── New step-by-step booking handlers ──────────────────────────

async function resolveMovieId(movieId) {
    if (/^[0-9a-fA-F]{24}$/.test(movieId)) {
        return movieId;
    }
    const movie = await resolveOrCreateLocalMovie(movieId);
    return movie?._id?.toString() || null;
}

async function handleGetExperiences(res, movieId) {
    if (!movieId) {
        return res.status(400).json({ reply: 'Please select a movie first!', type: 'error' });
    }
    const resolvedId = await resolveMovieId(movieId);
    if (!resolvedId) {
        return res.json({ reply: 'Movie not found in our system.', type: 'error', buttons: [] });
    }

    const movie = await Movie.findById(resolvedId);
    if (isComingSoonRelease(movie?.release_date)) {
        return comingSoonResponse(res);
    }

    const now = new Date();
    const shows = await Show.find({ movie_id: resolvedId, show_time: { $gt: now } })
        .populate('theater_id', 'screen_type name');

    if (!shows.length) {
        return res.json({
            reply: 'No upcoming showtimes found for this movie.',
            type: 'no_shows', buttons: [],
        });
    }

    // Collect distinct experiences
    const expSet = new Map();
    for (const s of shows) {
        const screenType = s.theater_id?.screen_type || 'standard';
        const exp = SCREEN_TO_EXP[screenType] || 'Standard';
        if (!expSet.has(exp)) expSet.set(exp, screenType);
    }

    const EXP_ORDER = ['IMAX', 'Dolby', '4DX', 'Deluxe', 'Standard'];
    const experiences = EXP_ORDER.filter(e => expSet.has(e));

    const buttons = experiences.map(exp => ({
        type: 'experience_option',
        label: exp,
        experience: exp,
    }));

    return res.json({
        reply: `Great choice! **${movie?.title || 'This movie'}** is available in the following experiences:\n\n${experiences.map(e => `• **${e}**`).join('\n')}\n\nWhich experience would you like?`,
        type: 'experiences_list',
        buttons,
    });
}

async function handleGetDates(res, movieId, experience) {
    if (!movieId || !experience) {
        return res.status(400).json({ reply: 'Please select a movie and experience first!', type: 'error' });
    }
    const resolvedId = await resolveMovieId(movieId);
    if (!resolvedId) {
        return res.json({ reply: 'Movie not found.', type: 'error', buttons: [] });
    }

    const movie = await Movie.findById(resolvedId);
    if (isComingSoonRelease(movie?.release_date)) {
        return comingSoonResponse(res);
    }

    const screenTypes = EXP_TO_SCREENS[experience] || ['standard'];
    const theaters = await Theater.find({ screen_type: { $in: screenTypes } });
    const theaterIds = theaters.map(t => t._id);

    const now = new Date();
    const shows = await Show.find({
        movie_id: resolvedId,
        theater_id: { $in: theaterIds },
        show_time: { $gt: now },
    }).sort({ show_time: 1 });

    if (!shows.length) {
        return res.json({
            reply: `No upcoming ${experience} showtimes for this movie.`,
            type: 'no_shows', buttons: [],
        });
    }

    // Collect distinct dates
    const dateMap = new Map();
    for (const s of shows) {
        const dt = new Date(s.show_time);
        const key = dt.toISOString().split('T')[0];
        if (!dateMap.has(key)) {
            dateMap.set(key, dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        }
    }

    const buttons = Array.from(dateMap.entries()).slice(0, 7).map(([key, label]) => ({
        type: 'date_option',
        label,
        date: key,
    }));

    return res.json({
        reply: `**${experience}** showtimes are available on these dates:\n\n${buttons.map(b => `• **${b.label}**`).join('\n')}\n\nWhich day works for you?`,
        type: 'dates_list',
        buttons,
    });
}

async function handleGetShowsFiltered(res, movieId, experience, date) {
    if (!movieId || !experience || !date) {
        return res.status(400).json({ reply: 'Please select movie, experience, and date first!', type: 'error' });
    }
    const resolvedId = await resolveMovieId(movieId);
    if (!resolvedId) {
        return res.json({ reply: 'Movie not found.', type: 'error', buttons: [] });
    }

    const movie = await Movie.findById(resolvedId);
    if (isComingSoonRelease(movie?.release_date)) {
        return comingSoonResponse(res);
    }

    const screenTypes = EXP_TO_SCREENS[experience] || ['standard'];
    const theaters = await Theater.find({ screen_type: { $in: screenTypes } });
    const theaterIds = theaters.map(t => t._id);

    const [year, month, day] = String(date).split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0);
    const now = new Date();

    const shows = await Show.find({
        movie_id: resolvedId,
        theater_id: { $in: theaterIds },
        show_time: { $gte: dayStart < now ? now : dayStart, $lt: dayEnd },
    }).populate('theater_id', 'name capacity screen_type').sort({ show_time: 1 });

    if (!shows.length) {
        return res.json({
            reply: `No ${experience} showtimes available on this date.`,
            type: 'no_shows', buttons: [],
        });
    }

    const buttons = shows.map(s => {
        const dt = new Date(s.show_time);
        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
            type: 'show_option',
            label: `${timeStr} - ${s.theater_id?.name || 'Hall'}`,
            sublabel: `${experience} • ${s.price} EGP`,
            showId: s._id.toString(),
            movieId: movie?.tmdb_id ? String(movie.tmdb_id) : resolvedId,
            localMovieId: resolvedId,
            theaterName: s.theater_id?.name || 'Hall',
            price: s.price,
            availableSeats: null, // skip heavy seat count for speed
            soldOut: false,
        };
    });

    return res.json({
        reply: `**${experience}** showtimes for **${movie?.title || 'this movie'}** on **${buttons[0]?.sublabel?.split('•')[0]?.trim() || date}**:\n\n${buttons.map(b => `• ${b.label} — ${b.sublabel}`).join('\n')}\n\nPick a showtime to continue!`,
        type: 'shows_list',
        buttons,
    });
}

async function handleGetMoviesByGenre(res, genre) {
    return res.json(await getMoviesByGenreReply(genre));
}

async function getMoviesByGenreReply(genre) {
    if (!genre) {
        return { reply: 'Please tell me what genre you\'re interested in!', type: 'error', buttons: [] };
    }

    const movies = await findMoviesWithUpcomingShows({ genre: { $regex: genre, $options: 'i' } });

    if (!movies.length) {
        // Fallback: show all movies with active shows
        const allMovies = await findMoviesWithUpcomingShows();
        if (!allMovies.length) {
            return {
                reply: `I couldn't find any **${genre}** movies with upcoming showtimes. Check back soon! 🎬`,
                type: 'no_movies', buttons: [],
                source: 'database',
            };
        }
        return moviesListResponse(
            allMovies,
            `I don't have **${genre}** movies right now, but here are movies with upcoming showtimes`
        );
    }

    return moviesListResponse(movies, `Here are **${genre}** movies with upcoming showtimes`);
}

module.exports = {
    handleBookingChat,
    getShowtimesReplyForTmdbMovie,
    getGeneralShowtimesReply,
    getMoviesListReply,
    getMoviesByGenreReply,
    NO_SHOWTIMES_MESSAGE,
};
