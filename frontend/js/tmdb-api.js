/**
 * Homepage movie loader.
 * Source of truth: MongoDB backend API only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const FALLBACK_POSTER = 'https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster';

    function esc(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function poster(movie) {
        return movie.poster_url || FALLBACK_POSTER;
    }

    async function fetchMovies() {
        const response = await fetch(`${API_BASE}/movies?status=now_showing`);
        if (!response.ok) throw new Error(`Movies API returned ${response.status}`);
        return response.json();
    }

    function clearHero(slider) {
        slider.querySelectorAll('.slide').forEach((slide) => slide.remove());
        const dots = slider.querySelector('.slider-dots');
        if (dots) dots.remove();
    }

    function renderHero(movies) {
        const slider = document.getElementById('hero-slider');
        const loading = document.getElementById('hero-loading');
        if (!slider) return;

        clearHero(slider);
        if (loading) loading.style.display = 'none';

        const heroMovies = movies.slice(0, 5);
        if (heroMovies.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'slide active';
            empty.innerHTML = `
                <div class="slide-overlay"></div>
                <div class="slide-content">
                    <span class="slide-genre">THE HALL CINEMAS</span>
                    <h1 class="slide-title">NO MOVIES AVAILABLE RIGHT NOW.</h1>
                </div>`;
            slider.insertBefore(empty, slider.querySelector('.slider-arrow.prev'));
            return;
        }

        heroMovies.forEach((movie, index) => {
            const slide = document.createElement('div');
            slide.className = `slide${index === 0 ? ' active' : ''}`;
            slide.dataset.index = index;
            slide.innerHTML = `
                <img src="${esc(poster(movie))}" alt="${esc(movie.title)}" class="slide-bg" loading="${index === 0 ? 'eager' : 'lazy'}">
                <div class="slide-overlay"></div>
                <div class="slide-content">
                    <span class="slide-genre">${esc((movie.genre || 'Movie').toUpperCase())}</span>
                    <h1 class="slide-title">${esc(movie.title).toUpperCase()}</h1>
                    <p class="slide-overview">${esc(movie.description || '')}</p>
                    <div class="slide-actions">
                        <a href="movie-detail.html?id=${encodeURIComponent(movie.id || movie._id)}" class="btn btn-primary">BOOK NOW</a>
                        ${movie.trailer_url ? `<button class="btn btn-trailer" data-trailer="${esc(movie.trailer_url)}"><span class="play-icon"></span> PLAY TRAILER</button>` : ''}
                    </div>
                </div>`;
            slider.insertBefore(slide, slider.querySelector('.slider-arrow.prev'));
        });

        initHeroSlider();
    }

    function initHeroSlider() {
        const slider = document.getElementById('hero-slider');
        if (!slider) return;
        const slides = Array.from(slider.querySelectorAll('.slide'));
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        if (slides.length <= 1) return;

        const dots = document.createElement('div');
        dots.className = 'slider-dots';
        let current = 0;

        function show(index) {
            current = (index + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
            dots.querySelectorAll('.slider-dot').forEach((dot, i) => dot.classList.toggle('active', i === current));
        }

        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = `slider-dot${index === 0 ? ' active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
            dot.addEventListener('click', () => show(index));
            dots.appendChild(dot);
        });
        slider.appendChild(dots);

        if (prevBtn) prevBtn.onclick = () => show(current - 1);
        if (nextBtn) nextBtn.onclick = () => show(current + 1);
        setInterval(() => show(current + 1), 6000);
    }

    function renderGrid(movies) {
        const grid = document.querySelector('#now-showing .movies-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (movies.length === 0) {
            grid.innerHTML = '<div class="tmdb-error" style="grid-column:1/-1;text-align:center;padding:60px 20px;"><h3>No movies available right now.</h3></div>';
            return;
        }

        movies.slice(0, 12).forEach((movie) => {
            const card = document.createElement('a');
            card.href = `movie-detail.html?id=${encodeURIComponent(movie.id || movie._id)}`;
            card.className = 'movie-card';
            card.dataset.movieId = movie.id || movie._id;
            card.innerHTML = `
                <div class="movie-card-image-wrapper">
                    <div class="movie-card-rating">${esc(movie.rating || 'NR')}</div>
                    <img src="${esc(poster(movie))}" alt="${esc(movie.title)}" class="movie-card-image" loading="lazy">
                    <div class="movie-card-overlay"><span class="btn btn-primary">BOOK NOW</span></div>
                </div>
                <div class="movie-card-info">
                    <h3 class="movie-card-title">${esc(movie.title)}</h3>
                    <p class="movie-card-genre">${esc(movie.genre || 'Movie')}</p>
                </div>`;
            grid.appendChild(card);
        });
    }

    async function init() {
        try {
            const movies = await fetchMovies();
            renderHero(movies);
            renderGrid(movies);
        } catch (error) {
            const loading = document.getElementById('hero-loading');
            if (loading) loading.style.display = 'none';
            renderHero([]);
            renderGrid([]);
            console.error('[Homepage] Failed to load backend movies:', error.message);
        }
    }

    window.playTrailer = function (url) {
        if (url) window.open(url, '_blank', 'noopener');
    };

    document.addEventListener('DOMContentLoaded', init);
})();
