const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '8b17a4f6956553f204d913b742122c1e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western',
};

function posterUrl(path) {
    return path ? `${TMDB_IMAGE_BASE_URL}${path}` : null;
}

function genreFromIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 'Movie';
    return ids.slice(0, 2).map((id) => GENRE_MAP[id]).filter(Boolean).join(' / ') || 'Movie';
}

function genreFromDetails(details, fallbackIds) {
    if (Array.isArray(details?.genres) && details.genres.length > 0) {
        return details.genres.slice(0, 2).map((g) => g.name).join(' / ');
    }
    return genreFromIds(fallbackIds);
}

async function tmdbFetch(endpoint, params = {}) {
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
        params: {
            api_key: TMDB_API_KEY,
            language: 'en-US',
            ...params,
        },
        timeout: 12000,
    });
    return response.data;
}

async function getMovieDetails(tmdbId) {
    return tmdbFetch(`/movie/${tmdbId}`, { append_to_response: 'videos,release_dates' });
}

async function getHomepageNowPlayingMovies() {
    const nowPlayingData = await tmdbFetch('/movie/now_playing', { page: 1 });
    let movies = nowPlayingData.results || [];

    if (movies.length === 0) {
        const popularData = await tmdbFetch('/movie/popular', { page: 1 });
        movies = popularData.results || [];
    }

    const homepageMovies = movies.slice(0, 12);
    const details = await Promise.all(
        homepageMovies.map((movie) => getMovieDetails(movie.id).catch(() => null))
    );

    return homepageMovies.map((movie, index) => {
        const detail = details[index];
        const runtime = detail?.runtime || null;
        return {
            tmdb_id: movie.id,
            title: movie.title,
            description: detail?.overview || movie.overview || '',
            poster: posterUrl(movie.poster_path),
            poster_url: posterUrl(movie.poster_path),
            genre: genreFromDetails(detail, movie.genre_ids),
            duration: runtime,
            runtime,
            rating: movie.vote_average ? String(Number(movie.vote_average).toFixed(1)) : 'NR',
            release_date: detail?.release_date || movie.release_date || null,
            status: 'now_showing',
        };
    });
}

module.exports = {
    getHomepageNowPlayingMovies,
    getMovieDetails,
    posterUrl,
    genreFromDetails,
};
