/**
 * TMDB API Utility
 * Backend service for fetching movie data and posters
 * API Key stored securely in environment variables
 */

const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not configured. Movie posters will not be available.');
}

/**
 * Search for a movie and get its poster
 * @param {string} movieTitle - Movie title to search for
 * @returns {Promise<Object>} Movie data including poster URL
 */
async function getMoviePoster(movieTitle) {
    try {
        if (!TMDB_API_KEY) {
            return null;
        }

        const response = await axios.get(
            `${TMDB_BASE_URL}/search/movie`,
            {
                params: {
                    api_key: TMDB_API_KEY,
                    query: movieTitle
                }
            }
        );

        if (response.data.results && response.data.results.length > 0) {
            const movie = response.data.results[0];
            return {
                poster_path: movie.poster_path,
                poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
                title: movie.title,
                release_date: movie.release_date,
                overview: movie.overview,
                tmdb_id: movie.id
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching movie from TMDB:', error.message);
        return null;
    }
}

/**
 * Get multiple movie posters
 * @param {Array<string>} movieTitles - Array of movie titles
 * @returns {Promise<Array>} Array of movie data
 */
async function getMultipleMoviePosters(movieTitles) {
    try {
        const results = await Promise.all(
            movieTitles.map(title => getMoviePoster(title))
        );
        return results.filter(result => result !== null);
    } catch (error) {
        console.error('Error fetching multiple movies:', error.message);
        return [];
    }
}

module.exports = {
    getMoviePoster,
    getMultipleMoviePosters
};
