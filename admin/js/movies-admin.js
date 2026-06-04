/**
 * Admin movie management.
 * Source of truth: MongoDB backend API only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = (id) => document.getElementById(id);

    let allMovies = [];
    let filteredMovies = [];
    let currentStatus = 'all';
    let currentGenre = '';
    let currentSearch = '';
    let viewMode = 'grid';
    let editingId = null;
    let deleteTargetId = null;

    function esc(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function token() {
        return localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
    }

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
                ...(options.headers || {}),
            },
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }

    function setDate() {
        const el = $('today-date-text');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    }

    async function loadMovies() {
        showLoading(true);
        try {
            allMovies = await api('/movies');
        } catch (error) {
            allMovies = [];
            toast(`Unable to load backend movies: ${error.message}`, 'error');
        }
        showLoading(false);
        applyFilters();
        updateStats();
    }

    function applyFilters() {
        const searchEl = $('movie-search');
        currentSearch = (searchEl ? searchEl.value : '').toLowerCase().trim();
        filteredMovies = allMovies.filter((movie) => {
            const statusOk = currentStatus === 'all' || movie.status === currentStatus;
            const genreOk = !currentGenre || movie.genre === currentGenre;
            const searchOk = !currentSearch || `${movie.title} ${movie.genre} ${movie.description}`.toLowerCase().includes(currentSearch);
            return statusOk && genreOk && searchOk;
        });
        render();
    }

    function render() {
        const grid = $('movies-grid');
        const empty = $('movies-empty');
        if (!grid) return;
        grid.innerHTML = '';
        if (!filteredMovies.length) {
            grid.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }
        if (empty) empty.style.display = 'none';
        grid.style.display = viewMode === 'grid' ? 'grid' : 'block';
        grid.classList.toggle('movies-list-view', viewMode === 'list');
        filteredMovies.forEach((movie) => grid.appendChild(viewMode === 'grid' ? buildCard(movie) : buildListRow(movie)));
    }

    function statusLabel(status) {
        return { now_showing: 'Now Showing', coming_soon: 'Coming Soon', ended: 'Ended' }[status] || status || 'Unknown';
    }

    function buildCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = movie.id || movie._id;
        const id = movie.id || movie._id;
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        card.innerHTML = `
            <div class="movie-poster-wrap">
                ${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="${esc(movie.title)}" loading="lazy">` : noPosterHtml()}
                <span class="movie-status-badge badge-${esc(movie.status)}">${esc(statusLabel(movie.status))}</span>
                <div class="movie-card-actions">
                    <button class="mc-action-btn mc-edit-btn" data-id="${esc(id)}" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="mc-action-btn mc-delete-btn" data-id="${esc(id)}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="movie-card-body">
                <div class="movie-card-title">${esc(movie.title)}</div>
                <div class="movie-card-meta">${year ? `<i class="fas fa-calendar-alt"></i>${year}` : ''}${movie.duration ? `<i class="fas fa-clock"></i>${movie.duration} min` : ''}${movie.rating ? `<i class="fas fa-film"></i>${esc(movie.rating)}` : ''}</div>
                ${movie.genre ? `<div class="movie-card-genre">${esc(movie.genre)}</div>` : ''}
            </div>`;
        bindCardActions(card, movie);
        return card;
    }

    function buildListRow(movie) {
        const id = movie.id || movie._id;
        const row = document.createElement('div');
        row.className = 'movie-list-row';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '-';
        row.innerHTML = `
            <div class="movie-list-thumb">${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="${esc(movie.title)}" loading="lazy">` : '<i class="fas fa-film"></i>'}</div>
            <div class="movie-list-info"><div class="movie-list-title">${esc(movie.title)}</div><div class="movie-list-sub">${esc(movie.genre || '-')} - ${year} - ${movie.duration || '-'} min - ${esc(statusLabel(movie.status))}</div></div>
            <div class="movie-list-actions"><button class="mc-action-btn mc-edit-btn" data-id="${esc(id)}" title="Edit"><i class="fas fa-pen"></i></button><button class="mc-action-btn mc-delete-btn" data-id="${esc(id)}" title="Delete"><i class="fas fa-trash"></i></button></div>`;
        bindCardActions(row, movie);
        return row;
    }

    function bindCardActions(root, movie) {
        const id = movie.id || movie._id;
        root.querySelector('.mc-edit-btn')?.addEventListener('click', () => openEdit(id));
        root.querySelector('.mc-delete-btn')?.addEventListener('click', () => openDelete(id, movie.title));
    }

    function updateStats() {
        const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
        set('mstat-total', allMovies.length);
        set('mstat-showing', allMovies.filter((movie) => movie.status === 'now_showing').length);
        set('mstat-coming', allMovies.filter((movie) => movie.status === 'coming_soon').length);
        set('mstat-ended', allMovies.filter((movie) => movie.status === 'ended').length);
    }

    function openManualModal() {
        editingId = null;
        $('manual-movie-form')?.reset();
        setText('modal-manual-heading', 'Add Movie Manually');
        setText('btn-save-label', 'Save Movie');
        clearPosterPreview();
        $('modal-manual')?.classList.add('open');
    }

    function openEdit(id) {
        const movie = allMovies.find((item) => String(item.id || item._id) === String(id));
        if (!movie) return;
        editingId = id;
        setText('modal-manual-heading', 'Edit Movie');
        setText('btn-save-label', 'Update Movie');
        setVal('edit-movie-id', id);
        setVal('m-title', movie.title || '');
        setVal('m-status', movie.status || 'now_showing');
        setVal('m-description', movie.description || '');
        setVal('m-genre', movie.genre || '');
        setVal('m-duration', movie.duration || '');
        setVal('m-rating', movie.rating || '');
        setVal('m-release-date', movie.release_date ? movie.release_date.substring(0, 10) : '');
        setVal('m-poster-url', movie.poster_url || '');
        setVal('m-trailer-url', movie.trailer_url || '');
        updatePosterPreview();
        $('modal-manual')?.classList.add('open');
    }

    function closeManualModal() {
        $('modal-manual')?.classList.remove('open');
        editingId = null;
    }

    async function handleSaveMovie(event) {
        event.preventDefault();
        const title = ($('m-title')?.value || '').trim();
        const duration = Number($('m-duration')?.value || 0);
        if (!title || !duration) {
            showFormError('Title and duration are required.');
            return;
        }
        const payload = {
            title,
            status: $('m-status')?.value || 'now_showing',
            description: $('m-description')?.value || '',
            genre: $('m-genre')?.value || '',
            duration,
            rating: $('m-rating')?.value || '',
            release_date: $('m-release-date')?.value || null,
            poster_url: $('m-poster-url')?.value || null,
            trailer_url: $('m-trailer-url')?.value || null,
        };
        try {
            if (editingId) await api(`/movies/${encodeURIComponent(editingId)}`, { method: 'PUT', body: JSON.stringify(payload) });
            else await api('/movies', { method: 'POST', body: JSON.stringify(payload) });
            closeManualModal();
            await loadMovies();
            toast(editingId ? 'Movie updated in MongoDB.' : 'Movie added to MongoDB.', 'success');
        } catch (error) {
            showFormError(`Save failed: ${error.message}`);
        }
    }

    function openDelete(id, title) {
        deleteTargetId = id;
        setText('delete-movie-title', title || 'this movie');
        $('modal-delete')?.classList.add('open');
    }

    function closeDeleteModal() {
        $('modal-delete')?.classList.remove('open');
        deleteTargetId = null;
    }

    async function confirmDelete() {
        if (!deleteTargetId) return;
        try {
            await api(`/movies/${encodeURIComponent(deleteTargetId)}`, { method: 'DELETE' });
            closeDeleteModal();
            await loadMovies();
            toast('Movie deleted from MongoDB.', 'success');
        } catch (error) {
            toast(`Delete failed: ${error.message}`, 'error');
        }
    }

    function openApiModal() {
        const modal = $('modal-api');
        const results = $('tmdb-results');
        if (results) results.innerHTML = '<div class="tmdb-hint"><i class="fas fa-database"></i><p>External movie imports are disabled in this real-data pass. Add movies with the manual form so they save to MongoDB.</p></div>';
        if (modal) modal.classList.add('open');
    }

    function closeApiModal() {
        $('modal-api')?.classList.remove('open');
    }

    function setView(mode) {
        viewMode = mode;
        $('view-grid')?.classList.toggle('vtoggle-active', mode === 'grid');
        $('view-list')?.classList.toggle('vtoggle-active', mode === 'list');
        render();
    }

    function bindEvents() {
        $('btn-open-manual')?.addEventListener('click', openManualModal);
        $('btn-open-api')?.addEventListener('click', openApiModal);
        $('manual-movie-form')?.addEventListener('submit', handleSaveMovie);
        $('modal-manual-close')?.addEventListener('click', closeManualModal);
        $('modal-manual-cancel')?.addEventListener('click', closeManualModal);
        $('poster-clear-btn')?.addEventListener('click', clearPosterPreview);
        $('m-poster-url')?.addEventListener('input', updatePosterPreview);
        $('modal-api-close')?.addEventListener('click', closeApiModal);
        $('modal-delete-close')?.addEventListener('click', closeDeleteModal);
        $('modal-delete-cancel')?.addEventListener('click', closeDeleteModal);
        $('btn-confirm-delete')?.addEventListener('click', confirmDelete);
        $('movie-search')?.addEventListener('input', debounce(applyFilters, 250));
        $('genre-filter')?.addEventListener('change', () => { currentGenre = $('genre-filter').value; applyFilters(); });
        $('view-grid')?.addEventListener('click', () => setView('grid'));
        $('view-list')?.addEventListener('click', () => setView('list'));
        document.querySelectorAll('.ftab[data-status]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ftab[data-status]').forEach((item) => item.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentStatus = btn.dataset.status;
                applyFilters();
            });
        });
    }

    function setVal(id, value) { const el = $(id); if (el) el.value = value; }
    function setText(id, value) { const el = $(id); if (el) el.textContent = value; }

    function updatePosterPreview() {
        const url = ($('m-poster-url')?.value || '').trim();
        const row = $('poster-preview-row');
        const img = $('poster-preview-img');
        if (!row || !img) return;
        row.style.display = url ? 'flex' : 'none';
        img.src = url;
    }

    function clearPosterPreview() {
        setVal('m-poster-url', '');
        const row = $('poster-preview-row');
        if (row) row.style.display = 'none';
    }

    function showLoading(on) {
        const loading = $('movies-loading');
        const grid = $('movies-grid');
        const empty = $('movies-empty');
        if (loading) loading.style.display = on ? 'flex' : 'none';
        if (grid) grid.style.display = on ? 'none' : grid.style.display;
        if (empty) empty.style.display = 'none';
    }

    function showFormError(message) {
        const el = $('manual-form-error');
        if (el) { el.textContent = message; el.style.display = 'block'; }
    }

    function toast(message, type = 'info') {
        const cont = $('toast-container');
        if (!cont) return;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const item = document.createElement('div');
        item.className = `toast toast-${type}`;
        item.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${esc(message)}`;
        cont.appendChild(item);
        setTimeout(() => item.remove(), 3200);
    }

    function noPosterHtml() {
        return '<div class="movie-no-poster"><i class="fas fa-film"></i><span>No Poster</span></div>';
    }

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    async function init() {
        setDate();
        bindEvents();
        await loadMovies();
    }

    window._openManualModal = openManualModal;
    window._openApiModal = openApiModal;
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
