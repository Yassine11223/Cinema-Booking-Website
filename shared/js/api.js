/**
 * API Client - Cinema Booking System
 * Shared API communication layer used by both Frontend and Admin
 */

const API_BASE_URL = 'http://localhost:5000/api';

const api = {
    /**
     * Make an authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem('token');

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error.message);
            throw error;
        }
    },

    // --- Movies ---
    getMovies(params = '') {
        return this.request(`/movies${params}`);
    },

    getMovie(id) {
        return this.request(`/movies/${id}`);
    },

    // --- Shows ---
    getShows(movieId) {
        return this.request(`/shows?movieId=${movieId}`);
    },

    // --- Bookings ---
    createBooking(data) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getMyBookings() {
        return this.request('/bookings/my');
    },

    // --- Auth ---
    login(credentials) {
        return this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    register(userData) {
        return this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    // --- Payments ---
    processPayment(data) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // --- Theaters ---
    getTheaters() {
        return this.request('/theaters');
    },
};
