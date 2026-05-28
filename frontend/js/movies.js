/**
 * Movies.js - Movie listing page with Now Showing & Coming Soon sections
 * Frontend: Cinema Booking System
 * Uses TMDB API for real data with mock fallback
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
// MOCK DATA (Fallback when TMDB unavailable)
// ============================================

const MOCK_NOW_SHOWING = [
    {
        id: 1,
        title: "Dune: Part Two",
        overview: "Paul Atreides travels to the dangerous planet Arrakis to ensure the future of his family and people. A visionary journey unfolds as secrets of the universe are revealed.",
        genre_ids: [878, 12],
        vote_average: 8.5,
        release_date: "2024-02-28",
        poster_path: null
    },
    {
        id: 2,
        title: "The Brutalist",
        overview: "A Hungarian-Jewish industrialist survives World War II and builds a new life in America. A sweeping epic of ambition, survival, and the American dream.",
        genre_ids: [18],
        vote_average: 8.3,
        release_date: "2023-12-01",
        poster_path: null
    },
    {
        id: 3,
        title: "Oppenheimer",
        overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
        genre_ids: [18, 36],
        vote_average: 8.4,
        release_date: "2023-07-21",
        poster_path: null
    },
    {
        id: 4,
        title: "Killers of the Flower Moon",
        overview: "When oil is discovered beneath their land, the Osage people are murdered one by one. An FBI investigation uncovers a conspiracy of greed and betrayal.",
        genre_ids: [18, 80],
        vote_average: 8.2,
        release_date: "2023-10-20",
        poster_path: null
    },
    {
        id: 5,
        title: "Inception",
        overview: "A skilled thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.",
        genre_ids: [878, 28],
        vote_average: 8.8,
        release_date: "2010-07-16",
        poster_path: null
    },
    {
        id: 6,
        title: "The Dark Knight",
        overview: "When a menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.",
        genre_ids: [28, 80],
        vote_average: 9.0,
        release_date: "2008-07-18",
        poster_path: null
    },
    {
        id: 7,
        title: "Interstellar",
        overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. An epic sci-fi adventure across dimensions and time.",
        genre_ids: [878, 12],
        vote_average: 8.6,
        release_date: "2014-11-07",
        poster_path: null
    },
    {
        id: 8,
        title: "Pulp Fiction",
        overview: "The lives of two mob hitmen, a boxer, a gangster's wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
        genre_ids: [18, 80],
        vote_average: 8.9,
        release_date: "1994-10-14",
        poster_path: null
    }
];

const MOCK_COMING_SOON = [
    {
        id: 101,
        title: "Avatar: Fire & Ash",
        overview: "Jake Sully and Neytiri must confront a new threat to Pandora's future as a forgotten enemy from the past resurfaces with devastating power.",
        genre_ids: [878, 12],
        vote_average: 0,
        release_date: "2025-12-19",
        poster_path: null
    },
    {
        id: 102,
        title: "The Fantastic Four: First Steps",
        overview: "Marvel's first family gets a fresh start in the MCU. Four astronauts gain extraordinary powers after cosmic radiation exposure during a space mission.",
        genre_ids: [28, 878],
        vote_average: 0,
        release_date: "2025-07-25",
        poster_path: null
    },
    {
        id: 103,
        title: "Mission: Impossible – The Final Reckoning",
        overview: "Ethan Hunt faces his most dangerous mission yet in the thrilling conclusion to the Dead Reckoning saga. The fate of the world hangs in the balance.",
        genre_ids: [28, 53],
        vote_average: 0,
        release_date: "2025-05-23",
        poster_path: null
    },
    {
        id: 104,
        title: "Jurassic World Rebirth",
        overview: "Five years after the events of Dominion, the world has adapted to dinosaurs living among humans. A new crisis emerges that threatens both species.",
        genre_ids: [878, 12],
        vote_average: 0,
        release_date: "2025-07-02",
        poster_path: null
    },
    {
        id: 105,
        title: "Superman",
        overview: "James Gunn's reimagining of the Man of Steel. Clark Kent embraces his Kryptonian heritage while protecting Metropolis from an otherworldly threat.",
        genre_ids: [28, 878],
        vote_average: 0,
        release_date: "2025-07-11",
        poster_path: null
    },
    {
        id: 106,
        title: "Thunderbolts*",
        overview: "A ragtag group of antiheroes are recruited by the government for dangerous missions. They must learn to work together or face the consequences.",
        genre_ids: [28, 878],
        vote_average: 0,
        release_date: "2025-05-02",
        poster_path: null
    }
];

// ============================================
// STATE
// ============================================

let nowShowingMovies = [];
let comingSoonMovies = [];
let useTMDB = true;

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

    try {
        // Try loading from TMDB API
        await loadTMDBMovies();
    } catch (error) {
        console.warn('⚠️ TMDB failed, using mock data:', error.message);
        useTMDB = false;
        loadMockMovies();
    }

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
 * Load movies from TMDB API
 */
async function loadTMDBMovies() {
    console.log('🌐 Loading movies from TMDB...');

    const [nowPlayingData, upcomingData] = await Promise.all([
        tmdbMoviesFetch('/movie/now_playing', { page: 1 }),
        tmdbMoviesFetch('/movie/upcoming', { page: 1 })
    ]);

    nowShowingMovies = (nowPlayingData.results || []).slice(0, 12);
    comingSoonMovies = (upcomingData.results || []).slice(0, 12);

    // Filter out coming soon movies that are already in now showing
    const nowShowingIds = new Set(nowShowingMovies.map(m => m.id));
    comingSoonMovies = comingSoonMovies.filter(m => !nowShowingIds.has(m.id));

    console.log('✅ TMDB loaded:', nowShowingMovies.length, 'now showing,', comingSoonMovies.length, 'coming soon');

    renderNowShowing(nowShowingMovies);
    renderComingSoon(comingSoonMovies);
}

/**
 * Fallback: Load mock data
 */
function loadMockMovies() {
    console.log('📚 Loading mock movies...');

    nowShowingMovies = MOCK_NOW_SHOWING;
    comingSoonMovies = MOCK_COMING_SOON;

    renderNowShowing(nowShowingMovies);
    renderComingSoon(comingSoonMovies);
}

/**
 * TMDB fetch helper (self-contained for movies page)
 */
async function tmdbMoviesFetch(endpoint, params = {}) {
    const url = new URL(`${MOVIES_TMDB.BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', MOVIES_TMDB.API_KEY);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([key, val]) => url.searchParams.set(key, val));

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
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
    const genreStr = buildMovieGenreString(movie.genre_ids);
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
            const genreStr = buildMovieGenreString(m.genre_ids).toLowerCase();
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
        // Try TMDB first
        const movie = await tmdbGetMovieDetails(movieId);
        currentMovieData = movie;
        renderMovieDetailPage(movie);
    } catch (error) {
        console.warn('⚠️ TMDB detail failed, using mock:', error.message);
        // Fallback to mock data
        const allMockMovies = [...MOCK_NOW_SHOWING, ...MOCK_COMING_SOON];
        const movie = allMockMovies.find(m => m.id == movieId);

        if (movie) {
            currentMovieData = movie;
            renderMovieDetailPageMock(movie);
        } else {
            showMovieError('error-message', 'Movie not found.');
        }
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
    document.title = `${movie.title} | Scene Cinemas`;
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
                    <button class="btn btn-primary" onclick="document.getElementById('booking-section').scrollIntoView({behavior: 'smooth'})">
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
 */
function selectDate(dateStr) {
    // Clear any previous selection
    selectedShow = null;
    updateBookingSummary();

    // Generate show times for this date
    const shows = generateShowsForDate(dateStr);
    renderShowTimes(shows);
}

/**
 * Generate mock showtimes for a given date — multiple times PER format
 */
function generateShowsForDate(dateStr) {
    const formatSchedule = {
        'IMAX': [
            { time: '12:30 PM' },
            { time: '05:30 PM' },
            { time: '09:30 PM' }
        ],
        'Dolby Cinema': [
            { time: '03:00 PM' },
            { time: '07:00 PM' }
        ],
        'Standard': [
            { time: '10:00 AM' },
            { time: '01:00 PM' },
            { time: '04:30 PM' },
            { time: '08:00 PM' },
            { time: '11:00 PM' }
        ],
        'Deluxe': [
            { time: '02:00 PM' },
            { time: '06:30 PM' },
            { time: '10:30 PM' }
        ]
    };

    const shows = [];
    let showId = 1;

    SHOW_FORMATS.forEach(format => {
        const slots = formatSchedule[format] || [];
        slots.forEach(slot => {
            shows.push({
                id: showId++,
                date: dateStr,
                time: slot.time,
                format: format
            });
        });
    });

    return shows;
}

/**
 * Render showtimes grouped by format
 */
function renderShowTimes(shows) {
    const grid = document.getElementById('show-times-grid');
    if (!grid) return;

    if (!shows || shows.length === 0) {
        grid.innerHTML = '<div class="no-shows-message">No shows available for this date</div>';
        return;
    }

    // Store all shows for selection lookup
    grid._showsData = shows;

    // Group shows by format
    const grouped = {};
    SHOW_FORMATS.forEach(format => { grouped[format] = []; });
    shows.forEach(show => {
        if (!grouped[show.format]) grouped[show.format] = [];
        grouped[show.format].push(show);
    });

    // Build HTML for each format group
    let html = '';
    SHOW_FORMATS.forEach(format => {
        const formatShows = grouped[format];
        if (!formatShows || formatShows.length === 0) return;

        const formatClass = getFormatClass(format);

        html += `
            <div class="format-group">
                <div class="format-group-header">
                    <span class="format-group-badge ${formatClass}">${escapeHtml(format)}</span>
                    <div class="format-group-divider"></div>
                </div>
                <div class="time-slots">
                    ${formatShows.map(show => `
                        <button class="time-slot-btn" data-show-id="${show.id}" onclick="selectShow(${show.id}, this)">
                            ${show.time}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
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

/**
 * Handle Book Now button click
 */
function handleBookNow() {
    if (!selectedShow) return;

    // Store selected show in session
    sessionStorage.setItem('selectedShow', JSON.stringify(selectedShow));
    if (currentMovieData) {
        // Build genre string from TMDB genres array or genre_ids
        let genre = 'Movie';
        if (currentMovieData.genres && currentMovieData.genres.length > 0) {
            genre = currentMovieData.genres.slice(0, 2).map(g => g.name).join(' • ');
        } else if (currentMovieData.genre_ids && currentMovieData.genre_ids.length > 0) {
            genre = buildMovieGenreString(currentMovieData.genre_ids);
        }

        // Build duration string
        let duration = 'N/A';
        if (currentMovieData.runtime) {
            const h = Math.floor(currentMovieData.runtime / 60);
            const m = currentMovieData.runtime % 60;
            duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }

        // Build rating
        let rating = 'NR';
        if (currentMovieData.vote_average && currentMovieData.vote_average > 0) {
            rating = parseFloat(currentMovieData.vote_average).toFixed(1);
        }

        sessionStorage.setItem('selectedMovie', JSON.stringify({
            id: currentMovieData.id,
            title: currentMovieData.title,
            genre: genre,
            duration: duration,
            rating: rating
        }));
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html?redirect=booking.html';
    } else {
        window.location.href = `booking.html?showId=${selectedShow.id}`;
    }
}

// ============================================
// RENDER MOVIE DETAIL (MOCK FALLBACK)
// ============================================

function renderMovieDetailPageMock(movie) {
    const movieHero = document.getElementById('movie-hero');
    if (!movieHero) return;

    const poster = 'https://placehold.co/300x450/1a1a1a/b71c1c?text=' + encodeURIComponent(movie.title);
    const rating = movie.vote_average ? parseFloat(movie.vote_average).toFixed(1) : 'N/A';
    const genreStr = buildMovieGenreString(movie.genre_ids);
    const releaseDate = movie.release_date
        ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

    const genreTags = movie.genre_ids
        ? movie.genre_ids.map(id => `<span class="genre-tag">${escapeHtml(MOVIES_GENRE_MAP[id] || 'Drama')}</span>`).join('')
        : '';

    movieHero.innerHTML = `
        <div class="hero-content">
            <div class="hero-poster">
                <img src="${poster}" alt="${escapeHtml(movie.title)}">
            </div>
            <div class="hero-info">
                <h1>${escapeHtml(movie.title)}</h1>
                ${genreTags ? `<div class="genre-tags">${genreTags}</div>` : ''}
                <div class="rating-badge">
                    <i class="fas fa-star"></i> ${rating}/10
                </div>
                <div class="movie-meta">
                    <div class="meta-item">
                        <span class="meta-label">Release Date</span>
                        <span class="meta-value">${releaseDate}</span>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="document.getElementById('booking-section').scrollIntoView({behavior: 'smooth'})">
                        <i class="fas fa-ticket-alt"></i> BOOK NOW
                    </button>
                </div>
            </div>
        </div>
    `;

    // Synopsis
    renderSynopsis({ overview: movie.overview });

    // Booking (no trailer for mock)
    renderBookingSection(movie);

    // Update page title
    document.title = `${movie.title} | Scene Cinemas`;
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

