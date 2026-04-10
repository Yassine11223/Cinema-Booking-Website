/**
 * TMDB API Integration - Frontend
 * Fetches real movie data from TMDB and populates the homepage
 * 
 * ⚠️  Replace TMDB_API_KEY with your own key from https://www.themoviedb.org/settings/api
 */

const TMDB_CONFIG = {
    API_KEY: '8b17a4f6956553f204d913b742122c1e',  // 🔑 Replace with your TMDB API key
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE: 'https://image.tmdb.org/t/p',
    POSTER_SIZE: '/w500',
    BACKDROP_SIZE: '/original',
    PROFILE_SIZE: '/w185',
};

/* ============================================
   GENRE MAP (TMDB genre IDs → names)
   ============================================ */
const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
};

/* ============================================
   CERTIFICATION / RATING MAP
   ============================================ */
function mapCertification(voteAverage) {
    if (voteAverage >= 8) return '⭐ 8+';
    if (voteAverage >= 7) return '⭐ 7+';
    if (voteAverage >= 6) return 'PG-13';
    if (voteAverage >= 5) return 'PG';
    return 'NR';
}

/* ============================================
   API FETCH HELPERS
   ============================================ */
async function tmdbFetch(endpoint, params = {}) {
    const url = new URL(`${TMDB_CONFIG.BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', TMDB_CONFIG.API_KEY);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([key, val]) => url.searchParams.set(key, val));

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get movies currently playing in theaters
 */
async function getNowPlaying(page = 1) {
    return tmdbFetch('/movie/now_playing', { page });
}

/**
 * Get popular movies
 */
async function getPopular(page = 1) {
    return tmdbFetch('/movie/popular', { page });
}

/**
 * Get upcoming movies
 */
async function getUpcoming(page = 1) {
    return tmdbFetch('/movie/upcoming', { page });
}

/**
 * Get movie details (includes videos/trailers)
 */
async function getMovieDetails(movieId) {
    return tmdbFetch(`/movie/${movieId}`, { append_to_response: 'videos,release_dates' });
}

/**
 * Get the YouTube trailer key for a movie
 */
function getTrailerUrl(videos) {
    if (!videos || !videos.results) return null;
    const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
        || videos.results.find(v => v.type === 'Teaser' && v.site === 'YouTube')
        || videos.results.find(v => v.site === 'YouTube');
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

/**
 * Get US certification from release_dates
 */
function getUSCertification(releaseDates) {
    if (!releaseDates || !releaseDates.results) return null;
    const usRelease = releaseDates.results.find(r => r.iso_3166_1 === 'US');
    if (usRelease && usRelease.release_dates.length > 0) {
        const cert = usRelease.release_dates.find(rd => rd.certification)
            || usRelease.release_dates[0];
        return cert.certification || null;
    }
    return null;
}

/**
 * Build genre string from genre_ids array
 */
function buildGenreString(genreIds) {
    if (!genreIds || genreIds.length === 0) return 'Movie';
    const names = genreIds.slice(0, 2).map(id => GENRE_MAP[id] || 'Drama');
    return names.join(' / ').toUpperCase();
}

/* ============================================
   IMAGE HELPERS
   ============================================ */
function posterUrl(path) {
    if (!path) return 'https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster';
    return `${TMDB_CONFIG.IMAGE_BASE}${TMDB_CONFIG.POSTER_SIZE}${path}`;
}

function backdropUrl(path) {
    if (!path) return null;
    return `${TMDB_CONFIG.IMAGE_BASE}${TMDB_CONFIG.BACKDROP_SIZE}${path}`;
}

/* ============================================
   POPULATE HERO SLIDER
   ============================================ */
async function populateHeroSlider(movies) {
    const slider = document.getElementById('hero-slider');
    if (!slider) return;

    // Take top 5 movies with backdrops for the hero slider
    const heroMovies = movies.filter(m => m.backdrop_path).slice(0, 5);
    if (heroMovies.length === 0) return;

    // Hide loading state
    const heroLoading = document.getElementById('hero-loading');
    if (heroLoading) heroLoading.style.display = 'none';

    // Remove any existing slides
    const existingSlides = slider.querySelectorAll('.slide');
    existingSlides.forEach(slide => slide.remove());

    // Remove existing dots
    const existingDots = slider.querySelector('.slider-dots');
    if (existingDots) existingDots.remove();

    // Fetch details (trailers) for hero movies in parallel
    const detailsPromises = heroMovies.map(m => getMovieDetails(m.id).catch(() => null));
    const details = await Promise.all(detailsPromises);

    // Create new slides
    heroMovies.forEach((movie, index) => {
        const detail = details[index];
        const trailerUrl = detail ? getTrailerUrl(detail.videos) : null;
        const genreStr = buildGenreString(movie.genre_ids);

        const slide = document.createElement('div');
        slide.className = 'slide' + (index === 0 ? ' active' : '');
        slide.setAttribute('data-index', index);

        slide.innerHTML = `
            <img src="${backdropUrl(movie.backdrop_path)}" 
                 alt="${movie.title}" 
                 class="slide-bg"
                 loading="${index === 0 ? 'eager' : 'lazy'}">
            <div class="slide-overlay"></div>
            <div class="slide-content">
                <span class="slide-genre">${genreStr}</span>
                <h1 class="slide-title">${movie.title.toUpperCase()}</h1>
                <p class="slide-overview">${movie.overview ? movie.overview.substring(0, 150) + '...' : ''}</p>
                <div class="slide-actions">
                    <a href="movie-detail.html?id=${movie.id}" class="btn btn-primary">BOOK NOW</a>
                    ${trailerUrl ? `
                    <button class="btn btn-trailer" onclick="playTrailer('${trailerUrl}')">
                        <span class="play-icon"></span> PLAY TRAILER
                    </button>` : ''}
                </div>
            </div>
        `;

        // Insert before the arrow buttons
        const prevBtn = slider.querySelector('.slider-arrow.prev');
        if (prevBtn) {
            slider.insertBefore(slide, prevBtn);
        } else {
            slider.appendChild(slide);
        }
    });

    // Initialize the slider controls
    initHeroSlider();
}

/* ============================================
   HERO SLIDER CONTROLS
   (full slider with dots, arrows, autoplay,
    keyboard nav, and touch/swipe)
   ============================================ */
function initHeroSlider() {
    const slider = document.getElementById('hero-slider');
    const slides = slider.querySelectorAll('.slide');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    if (!slider || slides.length === 0) return;

    let currentSlide = 0;
    let autoPlayInterval;

    // Remove old dots if any
    const oldDots = slider.querySelector('.slider-dots');
    if (oldDots) oldDots.remove();

    // Create dot indicators
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'slider-dots';
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => {
            goToSlide(i);
            resetAutoPlay();
        });
        dotsContainer.appendChild(dot);
    });
    slider.appendChild(dotsContainer);

    const dots = dotsContainer.querySelectorAll('.slider-dot');

    function goToSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        currentSlide = index;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlideFn() {
        goToSlide(currentSlide + 1);
    }

    function prevSlideFn() {
        goToSlide(currentSlide - 1);
    }

    // Arrow buttons - clone to remove any old listeners
    if (nextBtn) {
        const newNext = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        newNext.addEventListener('click', () => { nextSlideFn(); resetAutoPlay(); });
    }
    if (prevBtn) {
        const newPrev = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        newPrev.addEventListener('click', () => { prevSlideFn(); resetAutoPlay(); });
    }

    // Auto-play every 6 seconds
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlideFn, 6000);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextSlideFn();
            resetAutoPlay();
        } else if (e.key === 'ArrowLeft') {
            prevSlideFn();
            resetAutoPlay();
        }
    });

    // Pause on hover
    slider.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
    slider.addEventListener('mouseleave', startAutoPlay);

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                nextSlideFn();
            } else {
                prevSlideFn();
            }
            resetAutoPlay();
        }
    }, { passive: true });

    // Start auto-play
    startAutoPlay();
}

/* ============================================
   POPULATE NOW SHOWING GRID
   ============================================ */
async function populateNowShowing(movies) {
    const grid = document.querySelector('#now-showing .movies-grid');
    if (!grid) return;

    // Take up to 12 movies for the grid
    const gridMovies = movies.slice(0, 12);
    if (gridMovies.length === 0) return;

    // Fetch details in parallel to get certifications
    const detailsPromises = gridMovies.map(m => getMovieDetails(m.id).catch(() => null));
    const details = await Promise.all(detailsPromises);

    // Clear existing content (loading skeletons or old cards)
    grid.innerHTML = '';

    // Create movie cards
    gridMovies.forEach((movie, index) => {
        const detail = details[index];
        const certification = detail ? getUSCertification(detail.release_dates) : null;
        const ratingBadge = certification || mapCertification(movie.vote_average);
        const genreStr = buildGenreString(movie.genre_ids);

        const card = document.createElement('a');
        card.href = `movie-detail.html?id=${movie.id}`;
        card.className = 'movie-card';
        card.setAttribute('data-tmdb-id', movie.id);

        card.innerHTML = `
            <div class="movie-card-image-wrapper">
                <div class="movie-card-rating">${ratingBadge}</div>
                <img src="${posterUrl(movie.poster_path)}" 
                     alt="${movie.title}" 
                     class="movie-card-image"
                     loading="lazy">
                <div class="movie-card-overlay">
                    <span class="btn btn-primary">BOOK NOW</span>
                </div>
            </div>
            <div class="movie-card-info">
                <h3 class="movie-card-title">${movie.title}</h3>
                <p class="movie-card-genre">${genreStr.split(' / ').map(g => g.charAt(0) + g.slice(1).toLowerCase()).join(' / ')}</p>
            </div>
        `;

        grid.appendChild(card);
    });
}

/* ============================================
   LOADING STATE
   ============================================ */
function showLoadingState() {
    // Show hero loading
    const heroLoading = document.getElementById('hero-loading');
    if (heroLoading) heroLoading.style.display = 'flex';

    // Add skeleton loaders to the movie grid
    const grid = document.querySelector('#now-showing .movies-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'movie-card movie-card-skeleton';
        skeleton.innerHTML = `
            <div class="movie-card-image-wrapper">
                <div class="skeleton-image"></div>
            </div>
            <div class="movie-card-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-genre"></div>
            </div>
        `;
        grid.appendChild(skeleton);
    }
}

function showError(message) {
    // Hide hero loading
    const heroLoading = document.getElementById('hero-loading');
    if (heroLoading) heroLoading.style.display = 'none';

    const grid = document.querySelector('#now-showing .movies-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="tmdb-error" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
            <h3 style="font-family: var(--font-display); font-size: 20px; letter-spacing: 2px; margin-bottom: 8px;">
                UNABLE TO LOAD MOVIES
            </h3>
            <p style="color: var(--text-muted); font-size: 14px;">${message}</p>
        </div>
    `;
}

/* ============================================
   INITIALIZATION
   ============================================ */
async function initTMDB() {
    // Check if API key is configured
    if (TMDB_CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE' || !TMDB_CONFIG.API_KEY) {
        console.warn('⚠️  TMDB API key not configured.');
        console.info('👉 Get your free API key at: https://www.themoviedb.org/settings/api');
        console.info('👉 Then set it in js/tmdb-api.js → TMDB_CONFIG.API_KEY');
        showError('TMDB API key not configured. Please set your API key in js/tmdb-api.js');
        return;
    }

    try {
        showLoadingState();

        // Fetch now playing movies
        const nowPlayingData = await getNowPlaying();
        let movies = nowPlayingData.results || [];

        if (movies.length === 0) {
            // Fallback to popular movies
            const popularData = await getPopular();
            movies = popularData.results || [];
        }

        if (movies.length === 0) {
            showError('No movies found. Please try again later.');
            return;
        }

        // Populate both sections
        await Promise.all([
            populateHeroSlider(movies),
            populateNowShowing(movies)
        ]);

        console.log('✅ TMDB movies loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load TMDB data:', error);
        showError('Could not connect to movie database. Please try again later.');
    }
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initTMDB();
});
