/**
 * Public movie listing and detail pages.
 * Source of truth: MongoDB backend API only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const FALLBACK_POSTER = 'https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster';
    const FORMAT_MAP = {
        'imax theatre': 'IMAX',
        imax: 'IMAX',
        'dolby atmos': 'Dolby Cinema',
        dolby: 'Dolby Cinema',
        'hall 1': 'Standard',
        'hall 2': 'Standard',
        'hall 3': 'Standard',
        standard: 'Standard',
        'deluxe suite': 'Deluxe',
        deluxe: 'Deluxe',
        vip: 'Deluxe',
    };

    let nowShowingMovies = [];
    let comingSoonMovies = [];
    let currentMovieData = null;
    let selectedShow = null;

    function esc(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function poster(movie) {
        return movie.poster_url || FALLBACK_POSTER;
    }

    function movieId(movie) {
        return movie.id || movie._id;
    }

    function formatDuration(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    async function apiGet(path) {
        const response = await fetch(`${API_BASE}${path}`);
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
        return response.json();
    }

    async function loadMovies() {
        const movies = await apiGet('/movies');
        nowShowingMovies = movies.filter((movie) => movie.status === 'now_showing');
        comingSoonMovies = movies.filter((movie) => movie.status === 'coming_soon');
    }

    function emptyState(message) {
        return `<div style="grid-column:1/-1;text-align:center;padding:var(--space-3xl) 0;color:var(--text-muted);"><p>${esc(message)}</p></div>`;
    }

    function createMovieCard(movie, section) {
        const card = document.createElement('a');
        card.className = 'movie-card';
        card.href = `movie-detail.html?id=${encodeURIComponent(movieId(movie))}`;
        card.dataset.movieId = movieId(movie);
        const releaseDate = movie.release_date
            ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'TBA';

        card.innerHTML = `
            <div class="movie-card-image-wrapper">
                <div class="movie-card-rating ${section === 'coming-soon' ? 'coming-soon-badge' : ''}">${section === 'coming-soon' ? 'COMING SOON' : esc(movie.rating || 'NR')}</div>
                <img src="${esc(poster(movie))}" alt="${esc(movie.title)}" class="movie-card-image" loading="lazy">
                <div class="movie-card-overlay"><span class="btn ${section === 'coming-soon' ? 'btn-outline' : 'btn-primary'}">${section === 'coming-soon' ? 'DETAILS' : 'BOOK NOW'}</span></div>
            </div>
            <div class="movie-card-info">
                <h3 class="movie-card-title">${esc(movie.title)}</h3>
                <p class="movie-card-genre">${esc(movie.genre || 'Movie')}</p>
                ${section === 'coming-soon' ? `<p class="movie-card-release">${releaseDate}</p>` : ''}
            </div>`;
        return card;
    }

    function renderNowShowing(movies) {
        const grid = document.getElementById('now-showing-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!movies.length) {
            grid.innerHTML = emptyState('No movies available right now.');
            return;
        }
        movies.forEach((movie) => grid.appendChild(createMovieCard(movie, 'now-showing')));
    }

    function renderComingSoon(movies) {
        const grid = document.getElementById('coming-soon-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!movies.length) {
            grid.innerHTML = emptyState('No upcoming movies available right now.');
            return;
        }
        movies.forEach((movie) => grid.appendChild(createMovieCard(movie, 'coming-soon')));
    }

    function filterNowShowingByGenre(genre) {
        const normalized = (genre || '').toLowerCase();
        renderNowShowing(normalized
            ? nowShowingMovies.filter((movie) => (movie.genre || '').toLowerCase().includes(normalized))
            : nowShowingMovies);
    }

    async function initMoviesPage() {
        try {
            await loadMovies();
            renderNowShowing(nowShowingMovies);
            renderComingSoon(comingSoonMovies);
        } catch (error) {
            renderNowShowing([]);
            renderComingSoon([]);
            showMovieError('now-showing-error', 'Unable to load movies from the backend.');
            console.error('[Movies] Backend movies failed:', error.message);
        }

        const genreFilter = document.getElementById('genre-filter');
        if (genreFilter) genreFilter.addEventListener('change', (event) => filterNowShowingByGenre(event.target.value));
        initSubNav();
    }

    async function initMovieDetail() {
        const movieIdParam = new URLSearchParams(window.location.search).get('id');
        if (!movieIdParam) {
            showMovieError('error-message', 'Movie not found. Please select a valid movie.');
            return;
        }

        try {
            currentMovieData = await apiGet(`/movies/${encodeURIComponent(movieIdParam)}`);
            renderMovieDetailPage(currentMovieData);
            await renderBookingSection(currentMovieData);
        } catch (error) {
            showMovieError('error-message', 'Movie not found.');
            const hero = document.getElementById('movie-hero');
            if (hero) hero.innerHTML = '';
            console.error('[Movie Detail] Backend movie failed:', error.message);
        }
    }

    function renderMovieDetailPage(movie) {
        const hero = document.getElementById('movie-hero');
        if (!hero) return;
        const releaseDate = movie.release_date
            ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'N/A';

        hero.innerHTML = `
            <div class="hero-content">
                <div class="hero-poster"><img src="${esc(poster(movie))}" alt="${esc(movie.title)}"></div>
                <div class="hero-info">
                    <h1>${esc(movie.title)}</h1>
                    <div class="genre-tags">${movie.genre ? `<span class="genre-tag">${esc(movie.genre)}</span>` : ''}</div>
                    <div class="rating-badge"><i class="fas fa-star"></i> ${esc(movie.rating || 'NR')}</div>
                    <div class="movie-meta">
                        <div class="meta-item"><span class="meta-label">Duration</span><span class="meta-value">${formatDuration(movie.duration)}</span></div>
                        <div class="meta-item"><span class="meta-label">Release Date</span><span class="meta-value">${releaseDate}</span></div>
                    </div>
                    <div class="action-buttons">
                        ${movie.trailer_url ? `<button class="btn btn-trailer-hero" id="detail-trailer-btn"><i class="fas fa-play"></i> WATCH TRAILER</button>` : ''}
                        <button class="btn btn-primary" id="detail-book-btn"><i class="fas fa-ticket-alt"></i> BOOK NOW</button>
                    </div>
                </div>
            </div>`;

        const synopsis = document.getElementById('movie-synopsis');
        const synopsisSection = document.getElementById('synopsis-section');
        if (synopsis && synopsisSection) {
            synopsis.textContent = movie.description || '';
            synopsisSection.style.display = movie.description ? 'block' : 'none';
        }

        if (movie.trailer_url) {
            const trailerSection = document.getElementById('trailer-section');
            const trailerWrapper = document.getElementById('trailer-wrapper');
            if (trailerSection && trailerWrapper) {
                trailerSection.style.display = 'block';
                trailerWrapper.innerHTML = `<div class="trailer-placeholder"><a class="btn btn-primary" href="${esc(movie.trailer_url)}" target="_blank" rel="noopener"><i class="fas fa-play"></i> Open Trailer</a></div>`;
            }
            const trailerBtn = document.getElementById('detail-trailer-btn');
            if (trailerBtn) trailerBtn.onclick = () => trailerSection?.scrollIntoView({ behavior: 'smooth' });
        }

        const bookBtn = document.getElementById('detail-book-btn');
        if (bookBtn) bookBtn.onclick = () => document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
        document.title = `${movie.title} | THE HALL CINEMAS`;
    }

    function ensureBookingSection() {
        let section = document.getElementById('booking-section');
        if (section) return section;
        const details = document.getElementById('movie-details');
        if (!details) return null;
        section = document.createElement('section');
        section.className = 'detail-section';
        section.id = 'booking-section';
        section.innerHTML = `
            <h2 class="section-title">Showtimes</h2>
            <div class="date-selector" id="date-selector"></div>
            <div class="show-times-grid" id="show-times-grid"></div>
            <div class="booking-cta" id="booking-cta" style="display:none;">
                <div id="booking-summary"></div>
                <button class="btn btn-primary" id="btn-book-now">Choose Seats</button>
            </div>`;
        details.appendChild(section);
        return section;
    }

    async function renderBookingSection(movie) {
        const section = ensureBookingSection();
        if (!section || movie.status !== 'now_showing') return;
        renderDateSelector();
        await selectDate(new Date().toISOString().slice(0, 10));
    }

    function renderDateSelector() {
        const selector = document.getElementById('date-selector');
        if (!selector) return;
        selector.innerHTML = '';
        for (let i = 0; i < 7; i += 1) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const key = date.toISOString().slice(0, 10);
            const button = document.createElement('button');
            button.className = `date-btn${i === 0 ? ' active' : ''}`;
            button.dataset.date = key;
            button.innerHTML = `<span class="date-day">${i === 0 ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span><span class="date-num">${date.getDate()}</span><span class="date-month">${date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>`;
            button.addEventListener('click', async () => {
                selector.querySelectorAll('.date-btn').forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                await selectDate(key);
            });
            selector.appendChild(button);
        }
    }

    async function selectDate(dateKey) {
        selectedShow = null;
        updateBookingSummary();
        const grid = document.getElementById('show-times-grid');
        if (grid) grid.innerHTML = '<div class="no-shows-message">Loading showtimes...</div>';
        try {
            const shows = await apiGet(`/shows?movieId=${encodeURIComponent(movieId(currentMovieData))}&date=${encodeURIComponent(dateKey)}`);
            renderShowTimes(shows.map(formatShow));
        } catch (error) {
            renderShowTimes([]);
            console.error('[Movie Detail] Backend showtimes failed:', error.message);
        }
    }

    function formatShow(show) {
        const date = new Date(show.show_time);
        const theater = (show.theater_name || '').toLowerCase();
        return {
            id: show.id || show._id,
            date: date.toISOString().slice(0, 10),
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            format: FORMAT_MAP[theater] || 'Standard',
            hall: show.theater_name || 'Hall',
            price: Number(show.price || 0),
        };
    }

    function renderShowTimes(shows) {
        const grid = document.getElementById('show-times-grid');
        if (!grid) return;
        if (!shows.length) {
            grid.innerHTML = '<div class="no-shows-message">No showtimes available for this movie.</div>';
            return;
        }
        grid._showsData = shows;
        grid.innerHTML = shows.map((show) => `
            <button class="time-slot-btn" data-show-id="${esc(show.id)}">
                <span>${esc(show.time)}</span>
                <small>${esc(show.format)} - ${esc(show.hall)} - ${show.price.toLocaleString()} EGP</small>
            </button>`).join('');
        grid.querySelectorAll('.time-slot-btn').forEach((button) => {
            button.addEventListener('click', () => selectShow(button.dataset.showId, button));
        });
    }

    function selectShow(showId, button) {
        const grid = document.getElementById('show-times-grid');
        const shows = grid?._showsData || [];
        selectedShow = shows.find((show) => String(show.id) === String(showId));
        grid.querySelectorAll('.time-slot-btn').forEach((btn) => btn.classList.remove('selected'));
        button.classList.add('selected');
        updateBookingSummary();
    }

    function updateBookingSummary() {
        const cta = document.getElementById('booking-cta');
        const summary = document.getElementById('booking-summary');
        const button = document.getElementById('btn-book-now');
        if (!cta || !summary || !button) return;
        if (!selectedShow) {
            cta.style.display = 'none';
            button.disabled = true;
            return;
        }
        cta.style.display = 'flex';
        button.disabled = false;
        summary.innerHTML = `<strong>${esc(selectedShow.time)}</strong> - ${esc(selectedShow.format)} - ${selectedShow.price.toLocaleString()} EGP`;
        button.onclick = handleBookNow;
    }

    function handleBookNow() {
        if (!selectedShow || !currentMovieData) return;
        sessionStorage.setItem('selectedShow', JSON.stringify(selectedShow));
        sessionStorage.setItem('selectedMovie', JSON.stringify({
            id: movieId(currentMovieData),
            backendMovieId: movieId(currentMovieData),
            title: currentMovieData.title,
            genre: currentMovieData.genre || 'Movie',
            duration: formatDuration(currentMovieData.duration),
            rating: currentMovieData.rating || 'NR',
        }));
        window.location.href = `booking.html?showId=${encodeURIComponent(selectedShow.id)}&movieId=${encodeURIComponent(movieId(currentMovieData))}`;
    }

    function initSubNav() {
        document.querySelectorAll('.movies-sub-nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                document.querySelectorAll('.movies-sub-nav-link').forEach((item) => item.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    function showMovieError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    window.goToBookingFromDetail = handleBookNow;

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('now-showing-grid')) initMoviesPage();
        if (document.getElementById('movie-hero')) initMovieDetail();
    });
})();
