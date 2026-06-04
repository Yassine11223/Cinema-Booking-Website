/**
 * Movies.js - Movie listing page with Now Showing & Coming Soon sections
 * Frontend: Cinema Booking System
 * Uses backend API as the source of truth for public movie data
 */

console.log('✅ movies.js loaded');

// ============================================
// TMDB CONFIG (reuse from tmdb-api.js)
// ============================================

const MOVIES_TMDB = {
    API_KEY: '8b17a4f6956553f204d913b742122c1e',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE: 'https://image.tmdb.org/t/p',
    POSTER_SIZE: '/w500',
};

const MOVIES_GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
};

// ============================================
// STATE
// ============================================

let nowShowingMovies = [];
let comingSoonMovies = [];
let useTMDB = false;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 DOMContentLoaded fired in movies.js');

    const nowShowingGrid = document.getElementById('now-showing-grid');
    const comingSoonGrid = document.getElementById('coming-soon-grid');
    const movieHero = document.getElementById('movie-hero');

    // Movies listing page (movies.html)
    if (nowShowingGrid && comingSoonGrid) {
        console.log('📽️ Movies listing page detected');
        initMoviesPage();
    }
    // Movie detail page (movie-detail.html)
    else if (movieHero) {
        console.log('📄 Movie detail page detected');
        initMovieDetail();
    }

    // Setup sub-nav smooth scrolling & active state
    initSubNav();
});

/**
 * Initialize movies listing page
 */
async function initMoviesPage() {
    console.log('🎯 initMoviesPage called');

    await loadBackendMovies();

    // Setup genre filter (applies to Now Showing only)
    const genreFilter = document.getElementById('genre-filter');
    if (genreFilter) {
        genreFilter.addEventListener('change', (e) => {
            console.log('🔍 Filter changed to:', e.target.value);
            filterNowShowingByGenre(e.target.value);
        });
    }

    // Handle hash navigation on page load
    handleHashNavigation();
}

/**
 * Load movies from backend API
 */
async function loadBackendMovies() {
    console.log('Loading movies from backend API...');

    try {
        const response = await fetch('http://localhost:5000/api/movies');
        if (!response.ok) throw new Error(`Movies API error: ${response.status}`);
        const movies = await response.json();

        nowShowingMovies = movies
            .filter(movie => movie.status === 'now_showing')
            .map(mapBackendMovie);
        comingSoonMovies = movies
            .filter(movie => movie.status === 'coming_soon')
            .map(mapBackendMovie);

        renderNowShowing(nowShowingMovies);
        renderComingSoon(comingSoonMovies);
    } catch (error) {
        console.error('Backend movies unavailable:', error.message);
        showMovieError('movies-error', 'Movies are unavailable. Please try again later.');
        renderNowShowing([]);
        renderComingSoon([]);
    }
}

function mapBackendMovie(movie) {
    return {
        id: movie.id,
        backendMovieId: movie.id,
        title: movie.title,
        overview: movie.description || '',
        description: movie.description || '',
        genre: movie.genre || 'Movie',
        genres: movie.genre ? [{ name: movie.genre }] : [],
        genre_ids: [],
        vote_average: movie.rating || 'NR',
        certification: movie.rating || 'NR',
        runtime: movie.duration,
        release_date: movie.release_date,
        poster_url: movie.poster_url,
        poster_path: null,
        trailer_url: movie.trailer_url,
        status: movie.status,
    };
}

async function loadBackendMovieDetails(movieId) {
    const response = await fetch(`http://localhost:5000/api/movies/${movieId}`);
    if (!response.ok) throw new Error(`Movie API error: ${response.status}`);
    return mapBackendMovie(await response.json());
}

/**
 * Get movie details from TMDB
 */
async function tmdbGetMovieDetails(movieId) {
    return tmdbMoviesFetch(`/movie/${movieId}`, { append_to_response: 'videos,release_dates' });
}

// ============================================
// RENDER: NOW SHOWING
// ============================================

function renderNowShowing(movies) {
    const grid = document.getElementById('now-showing-grid');
    if (!grid) return;

    if (!movies || movies.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: var(--space-3xl) 0; color: var(--text-muted);">
                <p>No movies currently showing</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    movies.forEach(movie => {
        const card = createMovieCardElement(movie, 'now-showing');
        grid.appendChild(card);
    });

    console.log('✅ Now Showing rendered:', movies.length, 'movies');
}

// ============================================
// RENDER: COMING SOON
// ============================================

function renderComingSoon(movies) {
    const grid = document.getElementById('coming-soon-grid');
    if (!grid) return;

    if (!movies || movies.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: var(--space-3xl) 0; color: var(--text-muted);">
                <p>No upcoming movies at the moment</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    movies.forEach(movie => {
        const card = createMovieCardElement(movie, 'coming-soon');
        grid.appendChild(card);
    });

    console.log('✅ Coming Soon rendered:', movies.length, 'movies');
}

// ============================================
// MOVIE CARD CREATION
// ============================================

/**
 * Create a movie card DOM element using the existing card pattern
 * from tmdb-api.js / index.html (movie-card with movie-card-image-wrapper etc.)
 */
function createMovieCardElement(movie, section) {
    const poster = getMoviePoster(movie);
    const genreStr = movie.genre || buildMovieGenreString(movie.genre_ids);
    const ratingBadge = mapMovieCertification(movie.vote_average);
    const releaseDate = movie.release_date
        ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'TBA';

    const card = document.createElement('a');
    card.className = 'movie-card';
    card.setAttribute('data-movie-id', movie.id);

    if (section === 'now-showing') {
        card.href = `movie-detail.html?id=${movie.id}`;
        card.innerHTML = `
            <div class="movie-card-image-wrapper">
                <div class="movie-card-rating">${escapeHtml(ratingBadge)}</div>
                <img src="${poster}" 
                     alt="${escapeHtml(movie.title)}" 
                     class="movie-card-image"
                     loading="lazy"
                     onerror="this.src='https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster'">
                <div class="movie-card-overlay">
                    <span class="btn btn-primary">BOOK NOW</span>
                </div>
            </div>
            <div class="movie-card-info">
                <h3 class="movie-card-title">${escapeHtml(movie.title)}</h3>
                <p class="movie-card-genre">${escapeHtml(genreStr)}</p>
            </div>
        `;
    } else {
        // Coming Soon cards
        card.href = `movie-detail.html?id=${movie.id}`;
        card.innerHTML = `
            <div class="movie-card-image-wrapper">
                <div class="movie-card-rating coming-soon-badge">COMING SOON</div>
                <img src="${poster}" 
                     alt="${escapeHtml(movie.title)}" 
                     class="movie-card-image"
                     loading="lazy"
                     onerror="this.src='https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster'">
                <div class="movie-card-overlay">
                    <span class="btn btn-outline btn-notify"><i class="fas fa-bell"></i> NOTIFY ME</span>
                </div>
            </div>
            <div class="movie-card-info">
                <h3 class="movie-card-title">${escapeHtml(movie.title)}</h3>
                <p class="movie-card-genre">${escapeHtml(genreStr)}</p>
                <p class="movie-card-release">${releaseDate}</p>
            </div>
        `;

        // Prevent navigation for "Notify Me" — show confirmation instead
        card.addEventListener('click', (e) => {
            const notifyBtn = e.target.closest('.btn-notify');
            if (notifyBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleNotifyMe(movie, notifyBtn);
            }
        });
    }



    return card;
}

// ============================================
// GENRE FILTER
// ============================================

function filterNowShowingByGenre(genre) {
    if (!genre) {
        renderNowShowing(nowShowingMovies);
    } else {
        const genreLower = genre.toLowerCase();
        const filtered = nowShowingMovies.filter(m => {
            const genreStr = (m.genre || buildMovieGenreString(m.genre_ids)).toLowerCase();
            return genreStr.includes(genreLower);
        });
        renderNowShowing(filtered);
    }
}

// ============================================
// NOTIFY ME HANDLER
// ============================================

function handleNotifyMe(movie, btnElement) {
    // Store notification preference
    const notifications = JSON.parse(localStorage.getItem('movieNotifications') || '[]');
    const alreadyNotified = notifications.includes(movie.id);

    if (alreadyNotified) {
        // Remove notification
        const updated = notifications.filter(id => id !== movie.id);
        localStorage.setItem('movieNotifications', JSON.stringify(updated));
        btnElement.innerHTML = '<i class="fas fa-bell"></i> NOTIFY ME';
        btnElement.classList.remove('btn-primary');
        btnElement.classList.add('btn-outline');
    } else {
        // Add notification
        notifications.push(movie.id);
        localStorage.setItem('movieNotifications', JSON.stringify(notifications));
        btnElement.innerHTML = '<i class="fas fa-bell"></i> NOTIFIED ✓';
        btnElement.classList.remove('btn-outline');
        btnElement.classList.add('btn-primary');
    }
}

// ============================================
// SUB-NAVIGATION
// ============================================

function initSubNav() {
    const subNavLinks = document.querySelectorAll('.movies-sub-nav-link');
    if (subNavLinks.length === 0) return;

    // Handle click — smooth scroll via native anchor + scroll-behavior: smooth
    subNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Update active state
            subNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Update active link on scroll
    const sections = [
        { id: 'now-showing', el: document.getElementById('now-showing') },
        { id: 'coming-soon', el: document.getElementById('coming-soon') }
    ];

    window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY + 200;

        sections.forEach(section => {
            if (!section.el) return;
            const top = section.el.offsetTop;
            const bottom = top + section.el.offsetHeight;

            if (scrollPos >= top && scrollPos < bottom) {
                subNavLinks.forEach(l => l.classList.remove('active'));
                const activeLink = document.querySelector(`.movies-sub-nav-link[data-target="${section.id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    });
}

/**
 * Handle hash in URL on page load (e.g., movies.html#coming-soon)
 */
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash) {
        setTimeout(() => {
            const target = document.querySelector(hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }, 300);
    }
}

// ============================================
// MOVIE DETAIL PAGE (movie-detail.html)
// ============================================

let selectedShow = null;
let currentMovieData = null;

/**
 * Initialize movie detail page
 */
async function initMovieDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    const action = urlParams.get('action');

    if (!movieId) {
        showMovieError('error-message', 'Movie not found. Please select a valid movie.');
        return;
    }

    try {
        const movie = await loadBackendMovieDetails(movieId);
        currentMovieData = movie;
        renderMovieDetailPage(movie);
    } catch (error) {
        console.error('Movie detail API failed:', error.message);
        showMovieError('error-message', 'Movie not found.');
    }

    // Scroll to booking if book action
    if (action === 'book') {
        setTimeout(() => {
            const bookingSection = document.getElementById('booking-section');
            if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth' });
        }, 600);
    }

    // Setup Book Now CTA
    const bookNowBtn = document.getElementById('btn-book-now');
    if (bookNowBtn) {
        bookNowBtn.addEventListener('click', handleBookNow);
    }
}

// ============================================
// RENDER MOVIE DETAIL (TMDB)
// ============================================

function renderMovieDetailPage(movie) {
    renderHeroSection(movie);
    renderSynopsis(movie);
    renderTrailer(movie);
    renderBookingSection(movie);

    // Update page title
    document.title = `${movie.title} | THE HALL CINEMASs`;
}

/**
 * Render hero section with poster, info, genre tags, rating, meta, buttons
 */
function renderHeroSection(movie) {
    const movieHero = document.getElementById('movie-hero');
    if (!movieHero) return;

    const poster = movie.poster_path
        ? `${MOVIES_TMDB.IMAGE_BASE}${MOVIES_TMDB.POSTER_SIZE}${movie.poster_path}`
        : 'https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster';

    const backdrop = movie.backdrop_path
        ? `${MOVIES_TMDB.IMAGE_BASE}/original${movie.backdrop_path}`
        : null;

    const rating = movie.vote_average ? parseFloat(movie.vote_average).toFixed(1) : 'N/A';
    const duration = movie.runtime ? formatDuration(movie.runtime) : 'N/A';
    const releaseDate = movie.release_date
        ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

    // Genre tags
    const genreTags = movie.genres
        ? movie.genres.map(g => `<span class="genre-tag">${escapeHtml(g.name)}</span>`).join('')
        : '';

    // Trailer URL
    let trailerKey = null;
    if (movie.videos && movie.videos.results) {
        const trailer = movie.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
            || movie.videos.results.find(v => v.type === 'Teaser' && v.site === 'YouTube');
        if (trailer) trailerKey = trailer.key;
    }

    // Set backdrop on hero
    if (backdrop) {
        movieHero.style.backgroundImage = `linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.7) 50%, rgba(10,10,10,0.4) 100%), url('${backdrop}')`;
        movieHero.style.backgroundSize = 'cover';
        movieHero.style.backgroundPosition = 'center top';
    }

    movieHero.innerHTML = `
        <div class="hero-content">
            <div class="hero-poster">
                <img src="${poster}" alt="${escapeHtml(movie.title)}" onerror="this.src='https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster'">
            </div>
            <div class="hero-info">
                <h1>${escapeHtml(movie.title)}</h1>
                ${genreTags ? `<div class="genre-tags">${genreTags}</div>` : ''}
                <div class="rating-badge">
                    <i class="fas fa-star"></i> ${rating}/10 IMDB
                </div>
                <div class="movie-meta">
                    <div class="meta-item">
                        <span class="meta-label">Duration</span>
                        <span class="meta-value">${duration}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Release Date</span>
                        <span class="meta-value">${releaseDate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Language</span>
                        <span class="meta-value">${movie.original_language ? movie.original_language.toUpperCase() : 'EN'}</span>
                    </div>
                </div>
                <div class="action-buttons">
                    ${trailerKey ? `
                        <button class="btn btn-trailer-hero" onclick="scrollToTrailer()">
                            <i class="fas fa-play"></i> WATCH TRAILER
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="goToBookingFromDetail()">
                        <i class="fas fa-ticket-alt"></i> BOOK NOW
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render synopsis section
 */
function renderSynopsis(movie) {
    const synopsisEl = document.getElementById('movie-synopsis');
    const synopsisSection = document.getElementById('synopsis-section');
    if (movie.overview && synopsisEl && synopsisSection) {
        synopsisEl.textContent = movie.overview;
        synopsisSection.style.display = 'block';
    }
}

/**
 * Render trailer section with embedded YouTube player
 */
function renderTrailer(movie) {
    const trailerSection = document.getElementById('trailer-section');
    const trailerWrapper = document.getElementById('trailer-wrapper');
    if (!trailerSection || !trailerWrapper) return;

    let trailerKey = null;
    if (movie.videos && movie.videos.results) {
        const trailer = movie.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
            || movie.videos.results.find(v => v.type === 'Teaser' && v.site === 'YouTube');
        if (trailer) trailerKey = trailer.key;
    }

    if (!trailerKey) return;

    // Show trailer section with click-to-play placeholder
    trailerSection.style.display = 'block';
    trailerWrapper.innerHTML = `
        <img src="https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg" 
             alt="Trailer thumbnail" 
             style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;"
             onerror="this.src='https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg'">
        <div class="trailer-placeholder" onclick="loadTrailerIframe('${trailerKey}')">
            <div class="trailer-play-icon">
                <i class="fas fa-play"></i>
            </div>
            <span>Play Trailer</span>
        </div>
    `;
}

/**
 * Load YouTube iframe on click (privacy-friendly lazy load)
 */
function loadTrailerIframe(key) {
    const wrapper = document.getElementById('trailer-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${key}?autoplay=1&rel=0&modestbranding=1" 
                title="Movie Trailer" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
    `;
}

/**
 * Scroll to trailer section
 */
function scrollToTrailer() {
    const trailerSection = document.getElementById('trailer-section');
    if (trailerSection) {
        trailerSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// BOOKING SECTION: DATES + SHOWTIMES
// ============================================

const SHOW_FORMATS = ['IMAX', 'Dolby Cinema', 'Standard', 'Deluxe'];

/**
 * Render the full booking section: dates + initial time slots
 */
function renderBookingSection(movie) {
    const bookingSection = document.getElementById('booking-section');
    if (!bookingSection) return;

    bookingSection.style.display = 'block';

    // Generate dates (next 7 days)
    renderDateSelector();

    // Auto-select today
    const today = new Date();
    selectDate(today.toISOString().split('T')[0]);
}

/**
 * Render the horizontal date selector (7 days from today)
 */
function renderDateSelector() {
    const dateSelector = document.getElementById('date-selector');
    if (!dateSelector) return;

    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    dateSelector.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const dateStr = date.toISOString().split('T')[0];
        const dayName = i === 0 ? 'TODAY' : days[date.getDay()];

        const btn = document.createElement('button');
        btn.className = 'date-btn' + (i === 0 ? ' active' : '');
        btn.setAttribute('data-date', dateStr);
        btn.innerHTML = `
            <span class="date-day">${dayName}</span>
            <span class="date-num">${date.getDate()}</span>
            <span class="date-month">${months[date.getMonth()]}</span>
        `;

        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Load shows for this date
            selectDate(dateStr);
        });

        dateSelector.appendChild(btn);
    }
}

/**
 * Select a date and render time slots
 * Uses backend API only for date showtimes
 */
async function selectDate(dateStr) {
    // Clear any previous selection
    selectedShow = null;
    updateBookingSummary();

    // Try fetching real showtimes from backend
    try {
        const movieId = new URLSearchParams(window.location.search).get('id');
        if (movieId) {
            const res = await fetch(`http://localhost:5000/api/shows?movieId=${movieId}&date=${dateStr}`);
            if (res.ok) {
                const backendShows = await res.json();
                if (backendShows && backendShows.length > 0) {
                    const formatted = formatBackendShows(backendShows);
                    renderShowTimes(formatted);
                    console.log('✅ Showtimes loaded from backend:', backendShows.length);
                    return;
                }
            }
        }
    } catch (err) {
        console.error('Backend showtimes unavailable:', err.message);
        renderShowTimes([]);
    }
    renderShowTimes([]);
}

/**
 * Format backend show objects into the shape our renderer expects
 * Backend returns: { id, movie_id, theater_id, show_time, price, theater_name, ... }
 * Renderer expects: { id, date, time, format }
 */
function formatBackendShows(backendShows) {
    const THEATER_FORMAT_MAP = {
        'imax': 'IMAX',
        'imax theatre': 'IMAX',
        '3d': 'IMAX',
        'dolby': 'Dolby Cinema',
        'dolby atmos': 'Dolby Cinema',
        'standard': 'Standard',
        'hall 1': 'Standard',
        'hall 2': 'Standard',
        'hall 3': 'Standard',
        'vip': 'Deluxe',
        'deluxe': 'Deluxe',
        'deluxe suite': 'Deluxe',
    };

    return backendShows.map(show => {
        const showDate = new Date(show.show_time);
        const hours = showDate.getHours();
        const minutes = showDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        const timeStr = `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        const theaterName = (show.theater_name || '').toLowerCase();
        const screenType = (show.screen_type || '').toLowerCase();
        const format = THEATER_FORMAT_MAP[theaterName] || THEATER_FORMAT_MAP[screenType] || 'Standard';

        return {
            id: show.id,
            date: showDate.toISOString().split('T')[0],
            time: timeStr,
            format: format,
        };
    });
}

/**
 * Get CSS class for format badge
 */
function getFormatClass(format) {
    const map = {
        'IMAX': 'format-imax',
        'Dolby Cinema': 'format-dolby',
        'Standard': 'format-standard',
        'Deluxe': 'format-deluxe'
    };
    return map[format] || 'format-standard';
}

/**
 * Handle time slot selection — only one active at a time
 */
function selectShow(showId, btnElement) {
    const grid = document.getElementById('show-times-grid');
    const shows = grid._showsData || [];

    // Clear all previous selections
    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));

    // Select this button
    btnElement.classList.add('selected');

    // Find show data
    selectedShow = shows.find(s => s.id === showId);

    // Update booking summary
    updateBookingSummary();
}

/**
 * Update booking CTA with selected show info
 */
function updateBookingSummary() {
    const ctaSection = document.getElementById('booking-cta');
    const summaryEl = document.getElementById('booking-summary');
    const bookBtn = document.getElementById('btn-book-now');

    if (!ctaSection || !summaryEl || !bookBtn) return;

    if (!selectedShow) {
        ctaSection.style.display = 'none';
        bookBtn.disabled = true;
        return;
    }

    ctaSection.style.display = 'flex';
    bookBtn.disabled = false;

    const dateObj = new Date(selectedShow.date);
    const dateFormatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    summaryEl.innerHTML = `
        <div class="booking-summary-item">
            <span class="booking-summary-label">Date</span>
            <span class="booking-summary-value">${dateFormatted}</span>
        </div>
        <div class="booking-summary-item">
            <span class="booking-summary-label">Time</span>
            <span class="booking-summary-value">${selectedShow.time}</span>
        </div>
        <div class="booking-summary-item">
            <span class="booking-summary-label">Experience</span>
            <span class="booking-summary-value">${escapeHtml(selectedShow.format)}</span>
        </div>
    `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format duration from minutes to "Xh Ym" format
 */
function formatDuration(minutes) {
    if (!minutes) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Get poster URL for a movie
 */
function getMoviePoster(movie) {
    if (movie.poster_url) {
        return movie.poster_url;
    }
    if (movie.poster_path) {
        return `${MOVIES_TMDB.IMAGE_BASE}${MOVIES_TMDB.POSTER_SIZE}${movie.poster_path}`;
    }
    return 'https://placehold.co/300x450/1a1a1a/b71c1c?text=' + encodeURIComponent(movie.title || 'No Poster');
}

/**
 * Build genre string from genre_ids array
 */
function buildMovieGenreString(genreIds) {
    if (!genreIds || genreIds.length === 0) return 'Movie';
    const names = genreIds.slice(0, 2).map(id => MOVIES_GENRE_MAP[id] || 'Drama');
    return names.map(g => g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()).join(' / ');
}

/**
 * Map vote average to certification badge
 */
function mapMovieCertification(voteAverage) {
    if (typeof voteAverage === 'string') return voteAverage;
    if (!voteAverage || voteAverage === 0) return 'NR';
    if (voteAverage >= 8) return '⭐ ' + voteAverage.toFixed(1);
    if (voteAverage >= 7) return '⭐ ' + voteAverage.toFixed(1);
    if (voteAverage >= 6) return 'PG-13';
    if (voteAverage >= 5) return 'PG';
    return 'NR';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message
 */
function showMovieError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}


function goToBookingFromDetail() {
    if (!currentMovieData) return;
    const genreStr = currentMovieData.genre || (currentMovieData.genres ? currentMovieData.genres.map(g => g.name).join(', ') : buildMovieGenreString(currentMovieData.genre_ids));
    sessionStorage.setItem('selectedMovie', JSON.stringify({
        id: currentMovieData.id,
        backendMovieId: currentMovieData.backendMovieId || currentMovieData.id,
        title: currentMovieData.title,
        genre: genreStr,
        rating: currentMovieData.certification || currentMovieData.rating || (typeof currentMovieData.vote_average === 'number' ? currentMovieData.vote_average.toFixed(1) : 'NR'),
        duration: currentMovieData.runtime ? formatDuration(currentMovieData.runtime) : 'N/A'
    }));
    window.location.href = 'booking.html?movieId=' + currentMovieData.id;
}





