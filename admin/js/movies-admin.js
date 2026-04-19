/**
 * movies-admin.js
 * Full movie management: CRUD + TMDB import
 * Works with backend API; falls back to localStorage demo when offline.
 */

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */
    const API_BASE   = 'http://localhost:5000/api';
    const STORAGE_KEY = 'scene_admin_movies';

    /* =========================================================
       STATE
       ========================================================= */
    let allMovies   = [];
    let filteredMovies = [];
    let currentStatus  = 'all';
    let currentGenre   = '';
    let currentSearch  = '';
    let viewMode       = 'grid';   // 'grid' | 'list'
    let editingId      = null;     // movie id being edited
    let deleteTargetId = null;

    /* =========================================================
       DOM REFS
       ========================================================= */
    const $ = id => document.getElementById(id);

    const grid         = $('movies-grid');
    const loadingEl    = $('movies-loading');
    const emptyEl      = $('movies-empty');
    const toastCont    = $('toast-container');

    /* =========================================================
       INIT
       ========================================================= */
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setDate();
        bindEvents();
        await loadMovies();
    }

    function setDate() {
        const el = $('today-date-text');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' });
    }

    /* =========================================================
       BIND EVENTS
       ========================================================= */
    function bindEvents() {
        // Header buttons
        $('btn-open-manual').addEventListener('click', openManualModal);
        $('btn-open-api')   .addEventListener('click', openApiModal);

        // Manual form
        $('manual-movie-form')  .addEventListener('submit', handleSaveMovie);
        $('modal-manual-close') .addEventListener('click', closeManualModal);
        $('modal-manual-cancel').addEventListener('click', closeManualModal);
        $('modal-manual')       .addEventListener('click', e => { if (e.target === $('modal-manual')) closeManualModal(); });

        // Poster preview
        $('m-poster-url').addEventListener('input', debounce(updatePosterPreview, 600));
        $('poster-clear-btn').addEventListener('click', clearPosterPreview);

        // TMDB modal
        $('modal-api-close')   .addEventListener('click', closeApiModal);
        $('modal-api')         .addEventListener('click', e => { if (e.target === $('modal-api')) closeApiModal(); });
        $('btn-tmdb-search')   .addEventListener('click', doTmdbSearch);
        $('tmdb-search-input') .addEventListener('keydown', e => { if (e.key === 'Enter') doTmdbSearch(); });

        // Delete modal
        $('modal-delete-close') .addEventListener('click', closeDeleteModal);
        $('modal-delete-cancel').addEventListener('click', closeDeleteModal);
        $('modal-delete')       .addEventListener('click', e => { if (e.target === $('modal-delete')) closeDeleteModal(); });
        $('btn-confirm-delete') .addEventListener('click', confirmDelete);

        // Filters
        $('movie-search') .addEventListener('input', debounce(applyFilters, 300));
        $('genre-filter') .addEventListener('change', () => { currentGenre = $('genre-filter').value; applyFilters(); });

        document.querySelectorAll('.ftab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ftab').forEach(b => b.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentStatus = btn.dataset.status;
                applyFilters();
            });
        });

        // View toggle
        $('view-grid').addEventListener('click', () => setView('grid'));
        $('view-list').addEventListener('click', () => setView('list'));

        // Escape closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeManualModal(); closeApiModal(); closeDeleteModal(); }
        });
    }

    /* =========================================================
       LOAD MOVIES
       ========================================================= */
    async function loadMovies() {
        showLoading(true);
        try {
            const token = localStorage.getItem('admin_token') || '';
            const res = await fetch(`${API_BASE}/movies`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('API error');
            allMovies = await res.json();
            saveLocal(allMovies);
        } catch (_) {
            // Offline / no backend — use localStorage
            allMovies = loadLocal();
            if (allMovies.length === 0) allMovies = DEMO_MOVIES;
        }
        showLoading(false);
        applyFilters();
        updateStats();
    }

    /* =========================================================
       FILTERS & RENDER
       ========================================================= */
    function applyFilters() {
        currentSearch = ($('movie-search').value || '').toLowerCase().trim();

        filteredMovies = allMovies.filter(m => {
            const statusOk = currentStatus === 'all' || m.status === currentStatus;
            const genreOk  = !currentGenre || m.genre === currentGenre;
            const searchOk = !currentSearch ||
                m.title.toLowerCase().includes(currentSearch) ||
                (m.genre || '').toLowerCase().includes(currentSearch) ||
                (m.description || '').toLowerCase().includes(currentSearch);
            return statusOk && genreOk && searchOk;
        });

        render();
    }

    function render() {
        grid.innerHTML = '';

        if (filteredMovies.length === 0) {
            grid.style.display = 'none';
            emptyEl.style.display = 'flex';
            return;
        }

        emptyEl.style.display = 'none';
        grid.style.display    = viewMode === 'grid' ? 'grid' : 'block';
        grid.classList.toggle('movies-list-view', viewMode === 'list');

        filteredMovies.forEach(movie => {
            grid.appendChild(viewMode === 'grid' ? buildCard(movie) : buildListRow(movie));
        });
    }

    /* =========================================================
       BUILD CARD (Grid)
       ========================================================= */
    function buildCard(m) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = m.id;

        const posterHtml = m.poster_url
            ? `<img src="${esc(m.poster_url)}" alt="${esc(m.title)}" loading="lazy" onerror="this.parentElement.innerHTML=noPosterHtml()">`
            : noPosterHtml();

        const statusLabel = { now_showing:'Now Showing', coming_soon:'Coming Soon', ended:'Ended' }[m.status] || m.status;
        const dur = m.duration ? `${m.duration} min` : '';
        const year = m.release_date ? new Date(m.release_date).getFullYear() : '';

        card.innerHTML = `
            <div class="movie-poster-wrap">
                ${posterHtml}
                <span class="movie-status-badge badge-${m.status}">${statusLabel}</span>
                <div class="movie-card-actions">
                    <button class="mc-action-btn mc-edit-btn"   data-id="${m.id}" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="mc-action-btn mc-delete-btn" data-id="${m.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="movie-card-body">
                <div class="movie-card-title">${esc(m.title)}</div>
                <div class="movie-card-meta">
                    ${year ? `<i class="fas fa-calendar-alt"></i>${year}` : ''}
                    ${dur  ? `<i class="fas fa-clock"></i>${dur}` : ''}
                    ${m.rating ? `<i class="fas fa-film"></i>${esc(m.rating)}` : ''}
                </div>
                ${m.genre ? `<div class="movie-card-genre">${esc(m.genre)}</div>` : ''}
            </div>`;

        card.querySelector('.mc-edit-btn')  .addEventListener('click', () => openEdit(m.id));
        card.querySelector('.mc-delete-btn').addEventListener('click', () => openDelete(m.id, m.title));
        return card;
    }

    /* =========================================================
       BUILD LIST ROW
       ========================================================= */
    function buildListRow(m) {
        const row = document.createElement('div');
        row.className = 'movie-list-row';
        const year = m.release_date ? new Date(m.release_date).getFullYear() : '—';
        const statusLabel = { now_showing:'Now Showing', coming_soon:'Coming Soon', ended:'Ended' }[m.status] || m.status;

        row.innerHTML = `
            <div class="movie-list-thumb">
                ${m.poster_url
                    ? `<img src="${esc(m.poster_url)}" alt="${esc(m.title)}" loading="lazy">`
                    : `<i class="fas fa-film"></i>`}
            </div>
            <div class="movie-list-info">
                <div class="movie-list-title">${esc(m.title)}</div>
                <div class="movie-list-sub">${esc(m.genre || '—')} · ${year} · ${m.duration ? m.duration+'min' : '—'} · <span class="movie-status-badge badge-${m.status}" style="position:static;font-size:9px;padding:2px 7px;">${statusLabel}</span></div>
            </div>
            <div class="movie-list-actions">
                <button class="mc-action-btn mc-edit-btn"   data-id="${m.id}" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="mc-action-btn mc-delete-btn" data-id="${m.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>`;

        row.querySelector('.mc-edit-btn')  .addEventListener('click', () => openEdit(m.id));
        row.querySelector('.mc-delete-btn').addEventListener('click', () => openDelete(m.id, m.title));
        return row;
    }

    /* =========================================================
       STATS BAR
       ========================================================= */
    function updateStats() {
        $('mstat-total')   .textContent = allMovies.length;
        $('mstat-showing') .textContent = allMovies.filter(m => m.status === 'now_showing').length;
        $('mstat-coming')  .textContent = allMovies.filter(m => m.status === 'coming_soon').length;
        $('mstat-ended')   .textContent = allMovies.filter(m => m.status === 'ended').length;
    }

    /* =========================================================
       VIEW TOGGLE
       ========================================================= */
    function setView(mode) {
        viewMode = mode;
        $('view-grid').classList.toggle('vtoggle-active', mode === 'grid');
        $('view-list').classList.toggle('vtoggle-active', mode === 'list');
        render();
    }

    /* =========================================================
       MANUAL MODAL
       ========================================================= */
    function openManualModal() {
        editingId = null;
        $('modal-manual-heading').textContent = 'Add Movie Manually';
        $('btn-save-label').textContent        = 'Save Movie';
        $('manual-movie-form').reset();
        clearPosterPreview();
        $('edit-movie-id').value = '';
        hideFormError();
        $('modal-manual').classList.add('open');
        $('m-title').focus();
    }

    function openEdit(id) {
        const m = allMovies.find(x => String(x.id) === String(id));
        if (!m) return;
        editingId = id;

        $('modal-manual-heading').textContent = 'Edit Movie';
        $('btn-save-label').textContent        = 'Update Movie';
        $('edit-movie-id').value               = id;

        $('m-title')       .value = m.title        || '';
        $('m-status')      .value = m.status        || 'now_showing';
        $('m-description') .value = m.description   || '';
        $('m-genre')       .value = m.genre         || '';
        $('m-duration')    .value = m.duration      || '';
        $('m-rating')      .value = m.rating        || '';
        $('m-release-date').value = m.release_date ? m.release_date.substring(0,10) : '';
        $('m-poster-url')  .value = m.poster_url    || '';
        $('m-trailer-url') .value = m.trailer_url   || '';

        updatePosterPreview();
        hideFormError();
        $('modal-manual').classList.add('open');
        $('m-title').focus();
    }

    function closeManualModal() {
        $('modal-manual').classList.remove('open');
        editingId = null;
    }

    /* =========================================================
       POSTER PREVIEW
       ========================================================= */
    function updatePosterPreview() {
        const url = $('m-poster-url').value.trim();
        const row = $('poster-preview-row');
        const img = $('poster-preview-img');
        if (url) {
            img.src = url;
            row.style.display = 'flex';
        } else {
            row.style.display = 'none';
        }
    }

    function clearPosterPreview() {
        $('m-poster-url').value   = '';
        $('poster-preview-img').src = '';
        $('poster-preview-row').style.display = 'none';
    }

    /* =========================================================
       SAVE / UPDATE MOVIE
       ========================================================= */
    async function handleSaveMovie(e) {
        e.preventDefault();
        hideFormError();

        const title    = $('m-title').value.trim();
        const duration = parseInt($('m-duration').value);

        if (!title)           return showFormError('Movie title is required.');
        if (!duration || duration < 1) return showFormError('Please enter a valid duration.');

        const payload = {
            title,
            status:       $('m-status').value,
            description:  $('m-description').value.trim(),
            genre:        $('m-genre').value,
            duration,
            rating:       $('m-rating').value,
            release_date: $('m-release-date').value || null,
            poster_url:   $('m-poster-url').value.trim() || null,
            trailer_url:  $('m-trailer-url').value.trim() || null,
        };

        const btn = $('btn-save-movie');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

        try {
            let saved;
            if (editingId) {
                saved = await apiPut(`/movies/${editingId}`, payload);
            } else {
                saved = await apiPost('/movies', payload);
            }

            if (saved && saved.id) {
                // Update local array
                if (editingId) {
                    const idx = allMovies.findIndex(x => String(x.id) === String(editingId));
                    if (idx !== -1) allMovies[idx] = saved;
                } else {
                    allMovies.unshift(saved);
                }
                saveLocal(allMovies);
            } else {
                // Offline fallback
                if (editingId) {
                    const idx = allMovies.findIndex(x => String(x.id) === String(editingId));
                    if (idx !== -1) allMovies[idx] = { ...allMovies[idx], ...payload };
                } else {
                    allMovies.unshift({ id: Date.now(), ...payload });
                }
                saveLocal(allMovies);
            }

            closeManualModal();
            applyFilters();
            updateStats();
            toast(editingId ? 'Movie updated!' : 'Movie added!', 'success');
        } catch (err) {
            showFormError('Save failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-save"></i> <span id="btn-save-label">${editingId ? 'Update' : 'Save'} Movie</span>`;
        }
    }

    /* =========================================================
       DELETE
       ========================================================= */
    function openDelete(id, title) {
        deleteTargetId = id;
        $('delete-movie-name').textContent = title;
        $('modal-delete').classList.add('open');
    }

    function closeDeleteModal() {
        $('modal-delete').classList.remove('open');
        deleteTargetId = null;
    }

    async function confirmDelete() {
        if (!deleteTargetId) return;

        const btn = $('btn-confirm-delete');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…';

        try {
            await apiDelete(`/movies/${deleteTargetId}`);
        } catch (_) { /* offline — still remove locally */ }

        allMovies = allMovies.filter(m => String(m.id) !== String(deleteTargetId));
        saveLocal(allMovies);
        closeDeleteModal();
        applyFilters();
        updateStats();
        toast('Movie deleted.', 'success');
    }

    /* =========================================================
       TMDB MODAL
       ========================================================= */
    function openApiModal() {
        $('tmdb-results').innerHTML = `
            <div class="tmdb-hint" id="tmdb-hint">
                <i class="fas fa-film"></i>
                <p>Type a movie title above and hit Search</p>
            </div>`;
        $('tmdb-search-input').value = '';
        $('modal-api').classList.add('open');
        setTimeout(() => $('tmdb-search-input').focus(), 100);
    }

    function closeApiModal() {
        $('modal-api').classList.remove('open');
    }

    async function doTmdbSearch() {
        const q = $('tmdb-search-input').value.trim();
        if (!q) return;

        const resultsEl = $('tmdb-results');
        resultsEl.innerHTML = `<div class="tmdb-hint"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:14px;">Searching TMDB…</p></div>`;

        try {
            const token = localStorage.getItem('admin_token') || '';
            const res = await fetch(`${API_BASE}/movies/tmdb/search?q=${encodeURIComponent(q)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (res.status === 503) {
                // TMDB not configured — call public TMDB directly (demo key)
                throw new Error('TMDB_NOT_CONFIGURED');
            }

            if (!res.ok) throw new Error('Search failed');
            const results = await res.json();
            renderTmdbResults(results);

        } catch (err) {
            if (err.message === 'TMDB_NOT_CONFIGURED') {
                resultsEl.innerHTML = `
                    <div class="tmdb-hint">
                        <i class="fas fa-key" style="color:#c5a059;"></i>
                        <p style="color:#c5a059;">TMDB_API_KEY not set in your backend .env</p>
                        <span style="font-size:11px;">Add TMDB_API_KEY=your_key to backend/.env then restart the server</span>
                    </div>`;
            } else {
                resultsEl.innerHTML = `<div class="tmdb-hint"><i class="fas fa-exclamation-triangle" style="color:#ef5350;"></i><p style="color:#ef9a9a;">Search failed — is the backend running?</p></div>`;
            }
        }
    }

    function renderTmdbResults(results) {
        const el = $('tmdb-results');
        if (!results || results.length === 0) {
            el.innerHTML = `<div class="tmdb-hint"><i class="fas fa-search-minus"></i><p>No results found</p></div>`;
            return;
        }
        el.innerHTML = '';

        // Track already-added IDs by checking allMovies
        const existingTitles = new Set(allMovies.map(m => m.title.toLowerCase()));

        results.forEach(movie => {
            const year = movie.release_date ? movie.release_date.substring(0,4) : '—';
            const alreadyIn = existingTitles.has(movie.title.toLowerCase());
            const card = document.createElement('div');
            card.className = 'tmdb-result-card';
            card.id = `tmdb-card-${movie.tmdb_id}`;
            card.innerHTML = `
                ${movie.poster_url
                    ? `<img class="tmdb-poster" src="${esc(movie.poster_url)}" alt="${esc(movie.title)}" loading="lazy">`
                    : `<div class="tmdb-poster" style="display:flex;align-items:center;justify-content:center;font-size:22px;color:#444;"><i class="fas fa-film"></i></div>`}
                <div class="tmdb-info">
                    <div class="tmdb-title">${esc(movie.title)}</div>
                    <div class="tmdb-year">${year}${movie.vote_average ? ` · ⭐ ${movie.vote_average.toFixed(1)}` : ''}</div>
                    ${movie.overview ? `<div class="tmdb-over">${esc(movie.overview)}</div>` : ''}
                </div>
                <button class="btn-tmdb-import ${alreadyIn ? 'imported' : ''}"
                        data-tmdb-id="${movie.tmdb_id}"
                        ${alreadyIn ? 'disabled title="Already in your catalogue"' : ''}>
                    ${alreadyIn
                        ? `<i class="fas fa-check"></i> Added`
                        : `<i class="fas fa-plus"></i> Import`}
                </button>`;

            if (!alreadyIn) {
                card.querySelector('.btn-tmdb-import').addEventListener('click', () => importFromTmdb(movie, card));
            }
            el.appendChild(card);
        });
    }

    async function importFromTmdb(movie, card) {
        const btn = card.querySelector('.btn-tmdb-import');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const token = localStorage.getItem('admin_token') || '';
            let detail = null;

            // Try fetching full details from backend
            try {
                const r = await fetch(`${API_BASE}/movies/tmdb/${movie.tmdb_id}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (r.ok) detail = await r.json();
            } catch (_) {}

            const payload = detail || {
                title:        movie.title,
                description:  movie.overview,
                genre:        '',
                duration:     0,
                rating:       '',
                release_date: movie.release_date || null,
                poster_url:   movie.poster_url,
                trailer_url:  null,
                status:       'now_showing',
            };

            // Try saving to backend
            let saved = null;
            try {
                saved = await apiPost('/movies', payload);
            } catch (_) {}

            const newMovie = saved || { id: Date.now(), ...payload };
            allMovies.unshift(newMovie);
            saveLocal(allMovies);
            applyFilters();
            updateStats();

            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            btn.classList.add('imported');
            toast(`"${movie.title}" imported!`, 'success');

        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Import';
            toast('Import failed: ' + err.message, 'error');
        }
    }

    /* =========================================================
       API HELPERS
       ========================================================= */
    async function apiPost(path, body) {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch(API_BASE + path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    async function apiPut(path, body) {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch(API_BASE + path, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    async function apiDelete(path) {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch(API_BASE + path, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    /* =========================================================
       LOCAL STORAGE
       ========================================================= */
    function saveLocal(movies) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(movies)); } catch (_) {} }
    function loadLocal()       { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (_) { return []; } }

    /* =========================================================
       UI HELPERS
       ========================================================= */
    function showLoading(on) {
        loadingEl.style.display = on ? 'flex' : 'none';
        if (on) { grid.style.display = 'none'; emptyEl.style.display = 'none'; }
    }

    function showFormError(msg) {
        const el = $('manual-form-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideFormError() {
        const el = $('manual-form-error');
        el.style.display = 'none';
        el.textContent   = '';
    }

    function toast(msg, type = 'info') {
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
        toastCont.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 400); }, 3200);
    }

    function noPosterHtml() {
        return `<div class="movie-no-poster"><i class="fas fa-film"></i><span>No Poster</span></div>`;
    }

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function debounce(fn, delay) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    }

    /* =========================================================
       DEMO MOVIES (shown when backend is offline)
       ========================================================= */
    const DEMO_MOVIES = [
        { id:1, title:'Dune: Part Two',   genre:'Sci-Fi',    duration:167, rating:'PG-13', status:'now_showing', release_date:'2024-03-01', poster_url:'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',  description:'Paul Atreides unites with Chani and the Fremen.' },
        { id:2, title:'Oppenheimer',       genre:'Drama',     duration:180, rating:'R',     status:'ended',       release_date:'2023-07-21', poster_url:'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',  description:'The story of J. Robert Oppenheimer.' },
        { id:3, title:'Deadpool & Wolverine', genre:'Action', duration:128, rating:'R',     status:'now_showing', release_date:'2024-07-26', poster_url:'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',  description:'Marvel's unlikely buddy duo.' },
        { id:4, title:'Inside Out 2',      genre:'Animation', duration:100, rating:'PG',    status:'now_showing', release_date:'2024-06-14', poster_url:'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',  description:'New emotions arrive in Riley's mind.' },
        { id:5, title:'Alien: Romulus',    genre:'Horror',    duration:119, rating:'R',     status:'coming_soon', release_date:'2024-08-16', poster_url:'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg',  description:'Set between the original Alien films.' },
        { id:6, title:'Kingdom of the Planet of the Apes', genre:'Sci-Fi', duration:145, rating:'PG-13', status:'now_showing', release_date:'2024-05-10', poster_url:'https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQG1pyYgLVgf.jpg', description:'Many generations after Caesar.' },
    ];

})();
