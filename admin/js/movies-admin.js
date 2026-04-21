/**
 * movies-admin.js
 * Full movie management: CRUD + TMDB import
 * Works with backend API; falls back to localStorage when offline.
 * ──────────────────────────────────────────────────────
 *  Fixes applied:
 *  - Fast timeout on API fetch (3 s) so page never hangs
 *  - All DOM refs grabbed inside init() so they're guaranteed to exist
 *  - noPosterHtml handled via JS img.onerror instead of inline attribute
 *  - TMDB search works without backend (direct API call fallback)
 *  - Manual add works without backend (localStorage-only)
 */

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */
    const API_BASE    = 'http://localhost:5000/api';
    const STORAGE_KEY = 'scene_movies_catalog';
    const API_TIMEOUT = 3000;  // 3 seconds — fail fast when backend is down

    // Free TMDB read-only API key (v3 public demo – rate limited)
    // Users should set their own TMDB_API_KEY in backend .env for production
    const TMDB_FALLBACK_KEY = '8b17a4f6956553f204d913b742122c1e';

    /* =========================================================
       STATE
       ========================================================= */
    let allMovies      = [];
    let filteredMovies = [];
    let currentStatus  = 'all';
    let currentGenre   = '';
    let currentSearch  = '';
    let viewMode       = 'grid';   // 'grid' | 'list'
    let editingId      = null;     // movie id being edited
    let deleteTargetId = null;
    let backendOnline  = false;

    /* =========================================================
       DOM REFS (set in init)
       ========================================================= */
    const $ = id => document.getElementById(id);
    let grid, loadingEl, emptyEl, toastCont;

    /* =========================================================
       INIT
       ========================================================= */
    // Handle both cases: script loaded before or after DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function init() {
        console.log('[Movies Admin] Initializing...');

        // Grab DOM refs now that DOM is ready
        grid      = $('movies-grid');
        loadingEl = $('movies-loading');
        emptyEl   = $('movies-empty');
        toastCont = $('toast-container');

        setDate();
        bindEvents();

        // Expose modal functions globally for inline onclick handlers
        window._openManualModal = openManualModal;
        window._openApiModal    = openApiModal;

        console.log('[Movies Admin] Events bound, loading movies...');
        await loadMovies();
        console.log('[Movies Admin] Ready. Movies:', allMovies.length);
    }

    function setDate() {
        const el = $('today-date-text');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    /* =========================================================
       BIND EVENTS
       ========================================================= */
    function bindEvents() {
        // Header buttons
        safeClick('btn-open-manual', openManualModal);
        safeClick('btn-open-api',    openApiModal);

        // Manual form
        const manualForm = $('manual-movie-form');
        if (manualForm) manualForm.addEventListener('submit', handleSaveMovie);
        safeClick('modal-manual-close',  closeManualModal);
        safeClick('modal-manual-cancel', closeManualModal);
        const modalManual = $('modal-manual');
        if (modalManual) modalManual.addEventListener('click', e => { if (e.target === modalManual) closeManualModal(); });

        // Poster preview
        const posterInput = $('m-poster-url');
        if (posterInput) posterInput.addEventListener('input', debounce(updatePosterPreview, 600));
        safeClick('poster-clear-btn', clearPosterPreview);

        // TMDB modal
        safeClick('modal-api-close', closeApiModal);
        const modalApi = $('modal-api');
        if (modalApi) modalApi.addEventListener('click', e => { if (e.target === modalApi) closeApiModal(); });
        safeClick('btn-tmdb-search', doTmdbSearch);
        safeClick('btn-tmdb-sync', doTmdbSync);
        const tmdbInput = $('tmdb-search-input');
        if (tmdbInput) tmdbInput.addEventListener('keydown', e => { if (e.key === 'Enter') doTmdbSearch(); });

        // Delete modal
        safeClick('modal-delete-close',  closeDeleteModal);
        safeClick('modal-delete-cancel', closeDeleteModal);
        const modalDelete = $('modal-delete');
        if (modalDelete) modalDelete.addEventListener('click', e => { if (e.target === modalDelete) closeDeleteModal(); });
        safeClick('btn-confirm-delete', confirmDelete);

        // Filters
        const searchInput = $('movie-search');
        if (searchInput) searchInput.addEventListener('input', debounce(applyFilters, 300));
        const genreFilter = $('genre-filter');
        if (genreFilter) genreFilter.addEventListener('change', () => { currentGenre = genreFilter.value; applyFilters(); });

        document.querySelectorAll('.ftab[data-status]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ftab[data-status]').forEach(b => b.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentStatus = btn.dataset.status;
                applyFilters();
            });
        });

        // View toggle
        safeClick('view-grid', () => setView('grid'));
        safeClick('view-list', () => setView('list'));

        // Escape closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeManualModal(); closeApiModal(); closeDeleteModal(); }
        });
    }

    /** Safe click helper — won't crash if element doesn't exist */
    function safeClick(id, handler) {
        const el = $(id);
        if (el) el.addEventListener('click', handler);
    }

    /* =========================================================
       LOAD MOVIES
       ========================================================= */
    async function loadMovies() {
        showLoading(true);

        try {
            const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

            const res = await fetch(`${API_BASE}/movies`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) throw new Error('API error ' + res.status);
            allMovies = await res.json();
            backendOnline = true;
            saveLocal(allMovies);
            console.log(`[Movies] Loaded ${allMovies.length} movies from API`);
        } catch (err) {
            backendOnline = false;
            console.log('[Movies] Backend offline. Fetching live TMDB Now Playing...', err.message);

            // Always fetch fresh "Now Playing" + "Upcoming" from TMDB when backend is offline
            // This ensures admin always sees the same current movies as the user-facing site
            const [freshNowPlaying, freshUpcoming] = await Promise.all([
                fetchTmdbNowPlaying(),
                fetchTmdbUpcoming()
            ]);
            const freshMovies = [...freshNowPlaying, ...freshUpcoming];
            if (freshMovies.length > 0) {
                allMovies = freshMovies;
                saveLocal(allMovies);
                console.log(`[Movies] Loaded ${freshNowPlaying.length} now playing + ${freshUpcoming.length} upcoming from TMDB`);
            } else {
                // TMDB also failed — use cached as last resort
                allMovies = loadLocal();
                console.log(`[Movies] TMDB failed too, using ${allMovies.length} cached movies`);
            }
        }

        showLoading(false);
        applyFilters();
        updateStats();
    }

    /* =========================================================
       FILTERS & RENDER
       ========================================================= */
    function applyFilters() {
        const searchEl = $('movie-search');
        currentSearch = (searchEl ? searchEl.value : '').toLowerCase().trim();

        filteredMovies = allMovies.filter(m => {
            const statusOk = currentStatus === 'all' || m.status === currentStatus;
            const genreOk  = !currentGenre || m.genre === currentGenre;
            const searchOk = !currentSearch ||
                (m.title || '').toLowerCase().includes(currentSearch) ||
                (m.genre || '').toLowerCase().includes(currentSearch) ||
                (m.description || '').toLowerCase().includes(currentSearch);
            return statusOk && genreOk && searchOk;
        });

        render();
    }

    function render() {
        if (!grid) return;
        grid.innerHTML = '';

        if (filteredMovies.length === 0) {
            grid.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
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

        const statusLabel = { now_showing:'Now Showing', coming_soon:'Coming Soon', ended:'Ended' }[m.status] || m.status;
        const dur = m.duration ? `${m.duration} min` : '';
        const year = m.release_date ? new Date(m.release_date).getFullYear() : '';

        card.innerHTML = `
            <div class="movie-poster-wrap">
                ${m.poster_url
                    ? `<img src="${esc(m.poster_url)}" alt="${esc(m.title)}" loading="lazy">`
                    : noPosterHtml()}
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

        // Handle broken poster images via JS (not inline onerror)
        const img = card.querySelector('.movie-poster-wrap img');
        if (img) {
            img.onerror = function() {
                this.parentElement.innerHTML = noPosterHtml() +
                    `<span class="movie-status-badge badge-${m.status}">${statusLabel}</span>` +
                    `<div class="movie-card-actions">
                        <button class="mc-action-btn mc-edit-btn"   data-id="${m.id}" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="mc-action-btn mc-delete-btn" data-id="${m.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>`;
                // Re-bind action buttons after replacing innerHTML
                bindCardActions(card, m);
            };
        }

        bindCardActions(card, m);
        return card;
    }

    function bindCardActions(card, m) {
        const editBtn = card.querySelector('.mc-edit-btn');
        const delBtn  = card.querySelector('.mc-delete-btn');
        if (editBtn) editBtn.addEventListener('click', () => openEdit(m.id));
        if (delBtn)  delBtn.addEventListener('click', () => openDelete(m.id, m.title));
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
        const totalEl   = $('mstat-total');
        const showingEl = $('mstat-showing');
        const comingEl  = $('mstat-coming');
        const endedEl   = $('mstat-ended');

        if (totalEl)   totalEl.textContent   = allMovies.length;
        if (showingEl) showingEl.textContent  = allMovies.filter(m => m.status === 'now_showing').length;
        if (comingEl)  comingEl.textContent   = allMovies.filter(m => m.status === 'coming_soon').length;
        if (endedEl)   endedEl.textContent    = allMovies.filter(m => m.status === 'ended').length;
    }

    /* =========================================================
       VIEW TOGGLE
       ========================================================= */
    function setView(mode) {
        viewMode = mode;
        const gridBtn = $('view-grid');
        const listBtn = $('view-list');
        if (gridBtn) gridBtn.classList.toggle('vtoggle-active', mode === 'grid');
        if (listBtn) listBtn.classList.toggle('vtoggle-active', mode === 'list');
        render();
    }

    /* =========================================================
       MANUAL MODAL
       ========================================================= */
    function openManualModal() {
        editingId = null;
        const heading = $('modal-manual-heading');
        const label   = $('btn-save-label');
        const form    = $('manual-movie-form');
        if (heading) heading.textContent = 'Add Movie Manually';
        if (label)   label.textContent   = 'Save Movie';
        if (form)    form.reset();
        clearPosterPreview();
        const editId = $('edit-movie-id');
        if (editId) editId.value = '';
        hideFormError();
        const modal = $('modal-manual');
        if (modal) modal.classList.add('open');
        const titleInput = $('m-title');
        if (titleInput) setTimeout(() => titleInput.focus(), 100);
    }

    function openEdit(id) {
        const m = allMovies.find(x => String(x.id) === String(id));
        if (!m) return;
        editingId = id;

        const heading = $('modal-manual-heading');
        const label   = $('btn-save-label');
        if (heading) heading.textContent = 'Edit Movie';
        if (label)   label.textContent   = 'Update Movie';

        const editId = $('edit-movie-id');
        if (editId) editId.value = id;

        setVal('m-title',        m.title        || '');
        setVal('m-status',       m.status       || 'now_showing');
        setVal('m-description',  m.description  || '');
        setVal('m-genre',        m.genre        || '');
        setVal('m-duration',     m.duration     || '');
        setVal('m-rating',       m.rating       || '');
        setVal('m-release-date', m.release_date ? m.release_date.substring(0,10) : '');
        setVal('m-poster-url',   m.poster_url   || '');
        setVal('m-trailer-url',  m.trailer_url  || '');

        updatePosterPreview();
        hideFormError();
        const modal = $('modal-manual');
        if (modal) modal.classList.add('open');
        const titleInput = $('m-title');
        if (titleInput) setTimeout(() => titleInput.focus(), 100);
    }

    function closeManualModal() {
        const modal = $('modal-manual');
        if (modal) modal.classList.remove('open');
        editingId = null;
    }

    function setVal(id, val) {
        const el = $(id);
        if (el) el.value = val;
    }

    /* =========================================================
       POSTER PREVIEW
       ========================================================= */
    function updatePosterPreview() {
        const input = $('m-poster-url');
        const row   = $('poster-preview-row');
        const img   = $('poster-preview-img');
        if (!input || !row || !img) return;

        const url = input.value.trim();
        if (url) {
            img.src = url;
            row.style.display = 'flex';
        } else {
            row.style.display = 'none';
        }
    }

    function clearPosterPreview() {
        setVal('m-poster-url', '');
        const img = $('poster-preview-img');
        const row = $('poster-preview-row');
        if (img) img.src = '';
        if (row) row.style.display = 'none';
    }

    /* =========================================================
       SAVE / UPDATE MOVIE
       ========================================================= */
    async function handleSaveMovie(e) {
        e.preventDefault();
        hideFormError();

        const titleEl   = $('m-title');
        const durEl     = $('m-duration');
        const title     = (titleEl ? titleEl.value : '').trim();
        const duration  = parseInt(durEl ? durEl.value : 0);

        if (!title)                return showFormError('Movie title is required.');
        if (!duration || duration < 1) return showFormError('Please enter a valid duration.');

        const payload = {
            title,
            status:       ($('m-status')       || {}).value || 'now_showing',
            description:  ($('m-description')  || {}).value?.trim() || '',
            genre:        ($('m-genre')        || {}).value || '',
            duration,
            rating:       ($('m-rating')       || {}).value || '',
            release_date: ($('m-release-date') || {}).value || null,
            poster_url:   ($('m-poster-url')   || {}).value?.trim() || null,
            trailer_url:  ($('m-trailer-url')  || {}).value?.trim() || null,
        };

        const btn = $('btn-save-movie');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
        }

        try {
            let saved = null;

            // Try backend first
            if (backendOnline) {
                try {
                    if (editingId) {
                        saved = await apiPut(`/movies/${editingId}`, payload);
                    } else {
                        saved = await apiPost('/movies', payload);
                    }
                } catch (apiErr) {
                    console.warn('[Movies] API save failed, using localStorage:', apiErr.message);
                }
            }

            if (saved && saved.id) {
                // Server saved successfully
                if (editingId) {
                    const idx = allMovies.findIndex(x => String(x.id) === String(editingId));
                    if (idx !== -1) allMovies[idx] = saved;
                } else {
                    allMovies.unshift(saved);
                }
            } else {
                // Offline fallback — save locally
                if (editingId) {
                    const idx = allMovies.findIndex(x => String(x.id) === String(editingId));
                    if (idx !== -1) allMovies[idx] = { ...allMovies[idx], ...payload };
                } else {
                    allMovies.unshift({ id: Date.now(), ...payload, created_at: new Date().toISOString() });
                }
            }

            saveLocal(allMovies);
            closeManualModal();
            applyFilters();
            updateStats();
            toast(editingId ? 'Movie updated!' : 'Movie added!', 'success');
        } catch (err) {
            showFormError('Save failed: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-save"></i> <span id="btn-save-label">${editingId ? 'Update' : 'Save'} Movie</span>`;
            }
        }
    }

    /* =========================================================
       DELETE
       ========================================================= */
    function openDelete(id, title) {
        deleteTargetId = id;
        const nameEl = $('delete-movie-name');
        if (nameEl) nameEl.textContent = title;
        const modal = $('modal-delete');
        if (modal) modal.classList.add('open');
    }

    function closeDeleteModal() {
        const modal = $('modal-delete');
        if (modal) modal.classList.remove('open');
        deleteTargetId = null;
    }

    async function confirmDelete() {
        if (!deleteTargetId) return;

        const btn = $('btn-confirm-delete');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…';
        }

        try {
            if (backendOnline) {
                await apiDelete(`/movies/${deleteTargetId}`);
            }
        } catch (_) { /* offline — still remove locally */ }

        allMovies = allMovies.filter(m => String(m.id) !== String(deleteTargetId));
        saveLocal(allMovies);
        closeDeleteModal();
        applyFilters();
        updateStats();
        toast('Movie deleted.', 'success');

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        }
    }

    /* =========================================================
       TMDB MODAL
       ========================================================= */
    function openApiModal() {
        const resultsEl = $('tmdb-results');
        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="tmdb-hint" id="tmdb-hint">
                    <i class="fas fa-film"></i>
                    <p>Type a movie title above and hit Search</p>
                </div>`;
        }
        setVal('tmdb-search-input', '');
        const modal = $('modal-api');
        if (modal) modal.classList.add('open');
        const input = $('tmdb-search-input');
        if (input) setTimeout(() => input.focus(), 100);
    }

    function closeApiModal() {
        const modal = $('modal-api');
        if (modal) modal.classList.remove('open');
    }

    async function doTmdbSearch() {
        const input = $('tmdb-search-input');
        const q = input ? input.value.trim() : '';
        if (!q) return;

        const resultsEl = $('tmdb-results');
        if (resultsEl) resultsEl.innerHTML = `<div class="tmdb-hint"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:14px;">Searching TMDB…</p></div>`;

        // Strategy 1: Try backend proxy (has TMDB key configured on server)
        try {
            const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

            const res = await fetch(`${API_BASE}/movies/tmdb/search?q=${encodeURIComponent(q)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (res.status === 503) throw new Error('TMDB_NOT_CONFIGURED');
            if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED');
            if (!res.ok) throw new Error('Search failed');

            const results = await res.json();
            renderTmdbResults(results);
            return;

        } catch (err) {
            console.log('[TMDB] Backend proxy failed:', err.message);

            // Strategy 2: Direct TMDB API call (client-side)
            // Users need to have a TMDB API key set
            const tmdbKey = localStorage.getItem('tmdb_api_key') || TMDB_FALLBACK_KEY;

            if (tmdbKey) {
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(q)}&language=en-US&page=1`);
                    if (!res.ok) throw new Error('TMDB direct failed');
                    const data = await res.json();
                    const results = (data.results || []).slice(0, 10).map(m => ({
                        tmdb_id:      m.id,
                        title:        m.title,
                        overview:     m.overview,
                        release_date: m.release_date,
                        poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                        vote_average: m.vote_average,
                        genre_ids:    m.genre_ids,
                    }));
                    renderTmdbResults(results);
                    return;
                } catch (directErr) {
                    console.log('[TMDB] Direct API call failed:', directErr.message);
                }
            }

            // Show helpful error message
            if (resultsEl) {
                if (err.message === 'AUTH_REQUIRED') {
                    resultsEl.innerHTML = `
                        <div class="tmdb-hint">
                            <i class="fas fa-user-shield" style="color:#c5a059;"></i>
                            <p style="color:#c5a059;">Admin login required</p>
                            <span style="font-size:11px;">Log in as admin first, then return to this page</span>
                        </div>`;
                } else {
                    resultsEl.innerHTML = `
                        <div class="tmdb-hint">
                            <i class="fas fa-key" style="color:#c5a059;"></i>
                            <p style="color:#c5a059;">TMDB API Key Required</p>
                            <span style="font-size:12px;color:var(--text-secondary);line-height:1.6;display:block;margin-top:8px;">
                                To import movies from TMDB, either:<br>
                                <b>Option A:</b> Set <code>TMDB_API_KEY</code> in your backend <code>.env</code> file<br>
                                <b>Option B:</b> Enter your TMDB key below for client-side search
                            </span>
                            <div style="display:flex;gap:8px;margin-top:14px;">
                                <input type="text" id="tmdb-key-input" class="search-input" 
                                       placeholder="Paste your TMDB API key here…" 
                                       style="flex:1;font-size:12px;padding:8px 12px;">
                                <button class="btn-tmdb-search" id="btn-save-tmdb-key" style="font-size:12px;padding:8px 14px;">
                                    <i class="fas fa-save"></i> Save & Retry
                                </button>
                            </div>
                        </div>`;

                    // Bind save key button
                    const saveBtn = $('btn-save-tmdb-key');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', () => {
                            const keyInput = $('tmdb-key-input');
                            const key = keyInput ? keyInput.value.trim() : '';
                            if (key) {
                                localStorage.setItem('tmdb_api_key', key);
                                toast('TMDB API key saved! Retrying search…', 'success');
                                doTmdbSearch();
                            } else {
                                toast('Please enter a valid API key', 'error');
                            }
                        });
                    }
                }
            }
        }
    }

    async function doTmdbSync() {
        const resultsEl = $('tmdb-results');
        if (resultsEl) resultsEl.innerHTML = `<div class="tmdb-hint"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:14px;">Fetching Now Playing from TMDB…</p></div>`;

        const tmdbKey = localStorage.getItem('tmdb_api_key') || TMDB_FALLBACK_KEY;
        if (tmdbKey) {
            try {
                const res = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbKey}&language=en-US&page=1`);
                if (!res.ok) throw new Error('TMDB direct failed');
                const data = await res.json();
                const results = (data.results || []).slice(0, 20).map(m => ({
                    tmdb_id:      m.id,
                    title:        m.title,
                    overview:     m.overview,
                    release_date: m.release_date,
                    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                    vote_average: m.vote_average,
                    genre_ids:    m.genre_ids,
                }));
                renderTmdbResults(results);
            } catch (err) {
                console.log('[TMDB Sync] Failed:', err.message);
                if (resultsEl) resultsEl.innerHTML = `<div class="tmdb-hint"><i class="fas fa-exclamation-triangle"></i><p>Failed to sync from TMDB. Check API Key.</p></div>`;
            }
        }
    }

    function renderTmdbResults(results) {
        const el = $('tmdb-results');
        if (!el) return;

        if (!results || results.length === 0) {
            el.innerHTML = `<div class="tmdb-hint"><i class="fas fa-search-minus"></i><p>No results found</p></div>`;
            return;
        }
        el.innerHTML = '';

        // Track already-added by title
        const existingTitles = new Set(allMovies.map(m => (m.title || '').toLowerCase()));

        results.forEach(movie => {
            const year = movie.release_date ? movie.release_date.substring(0,4) : '—';
            const alreadyIn = existingTitles.has((movie.title || '').toLowerCase());
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
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            let detail = null;

            // Try fetching full details from backend
            if (backendOnline) {
                try {
                    const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
                    const r = await fetch(`${API_BASE}/movies/tmdb/${movie.tmdb_id}`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        signal: controller.signal
                    });
                    clearTimeout(timeout);
                    if (r.ok) detail = await r.json();
                } catch (_) {}
            }

            // If no backend detail, try direct TMDB
            if (!detail) {
                const tmdbKey = localStorage.getItem('tmdb_api_key') || TMDB_FALLBACK_KEY;
                if (tmdbKey) {
                    try {
                        const r = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${tmdbKey}&language=en-US`);
                        if (r.ok) {
                            const m = await r.json();
                            detail = {
                                title:        m.title,
                                description:  m.overview,
                                genre:        m.genres?.[0]?.name || '',
                                duration:     m.runtime || 0,
                                rating:       '',
                                release_date: m.release_date,
                                poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                                trailer_url:  null,
                                status:       'now_showing',
                            };
                        }
                    } catch (_) {}
                }
            }

            const payload = detail || {
                title:        movie.title,
                description:  movie.overview || '',
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
            if (backendOnline) {
                try {
                    saved = await apiPost('/movies', payload);
                } catch (_) {}
            }

            const newMovie = saved || { id: Date.now(), ...payload, created_at: new Date().toISOString() };
            allMovies.unshift(newMovie);
            saveLocal(allMovies);
            applyFilters();
            updateStats();

            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> Added';
                btn.classList.add('imported');
            }
            toast(`"${movie.title}" imported!`, 'success');

        } catch (err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> Import';
            }
            toast('Import failed: ' + err.message, 'error');
        }
    }

    /* =========================================================
       API HELPERS (with timeout)
       ========================================================= */
    async function apiPost(path, body) {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
        const res = await fetch(API_BASE + path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    async function apiPut(path, body) {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
        const res = await fetch(API_BASE + path, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    async function apiDelete(path) {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
        const res = await fetch(API_BASE + path, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            signal: controller.signal
        });
        clearTimeout(timeout);
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
        if (loadingEl) loadingEl.style.display = on ? 'flex' : 'none';
        if (on) {
            if (grid)    grid.style.display    = 'none';
            if (emptyEl) emptyEl.style.display = 'none';
        }
    }

    function showFormError(msg) {
        const el = $('manual-form-error');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function hideFormError() {
        const el = $('manual-form-error');
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    }

    function toast(msg, type = 'info') {
        const cont = toastCont || $('toast-container');
        if (!cont) return;
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
        cont.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(8px)';
            t.style.transition = 'all 0.35s ease';
            setTimeout(() => t.remove(), 400);
        }, 3200);
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
       TMDB LIVE FETCH (replaces old static DEMO_MOVIES)
       Fetches current "Now Playing" movies from TMDB API,
       matching the same data shown on the user-facing homepage.
       ========================================================= */
    const TMDB_GENRE_MAP = {
        28:'Action', 12:'Adventure', 16:'Animation', 35:'Comedy',
        80:'Crime', 99:'Documentary', 18:'Drama', 10751:'Family',
        14:'Fantasy', 36:'History', 27:'Horror', 10402:'Music',
        9648:'Mystery', 10749:'Romance', 878:'Sci-Fi', 10770:'TV Movie',
        53:'Thriller', 10752:'War', 37:'Western'
    };

    async function fetchTmdbNowPlaying() {
        const tmdbKey = localStorage.getItem('tmdb_api_key') || TMDB_FALLBACK_KEY;
        if (!tmdbKey) {
            console.warn('[Movies] No TMDB API key available');
            return [];
        }

        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbKey}&language=en-US&page=1`);
            if (!res.ok) throw new Error('TMDB API error ' + res.status);
            const data = await res.json();
            const movies = (data.results || []).slice(0, 20);

            // Fetch full details (runtime, genres) in parallel for each movie
            const detailPromises = movies.map(async (m) => {
                try {
                    const dRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${tmdbKey}&language=en-US`);
                    if (dRes.ok) return await dRes.json();
                } catch (_) {}
                return null;
            });
            const details = await Promise.all(detailPromises);

            return movies.map((m, i) => {
                const detail = details[i];
                const genre = detail?.genres?.[0]?.name
                    || (m.genre_ids?.[0] ? (TMDB_GENRE_MAP[m.genre_ids[0]] || '') : '');
                return {
                    id:           m.id,
                    title:        m.title,
                    description:  m.overview || '',
                    genre:        genre,
                    duration:     detail?.runtime || 0,
                    rating:       '',
                    release_date: m.release_date || null,
                    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                    trailer_url:  null,
                    status:       'now_showing',
                    created_at:   new Date().toISOString(),
                };
            });
        } catch (err) {
            console.error('[Movies] TMDB Now Playing fetch failed:', err.message);
            return [];
        }
    }

    async function fetchTmdbUpcoming() {
        const tmdbKey = localStorage.getItem('tmdb_api_key') || TMDB_FALLBACK_KEY;
        if (!tmdbKey) return [];

        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${tmdbKey}&language=en-US&page=1`);
            if (!res.ok) throw new Error('TMDB API error ' + res.status);
            const data = await res.json();
            const movies = (data.results || []).slice(0, 12);

            const detailPromises = movies.map(async (m) => {
                try {
                    const dRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${tmdbKey}&language=en-US`);
                    if (dRes.ok) return await dRes.json();
                } catch (_) {}
                return null;
            });
            const details = await Promise.all(detailPromises);

            return movies.map((m, i) => {
                const detail = details[i];
                const genre = detail?.genres?.[0]?.name
                    || (m.genre_ids?.[0] ? (TMDB_GENRE_MAP[m.genre_ids[0]] || '') : '');
                return {
                    id:           'upcoming_' + m.id,
                    title:        m.title,
                    description:  m.overview || '',
                    genre:        genre,
                    duration:     detail?.runtime || 0,
                    rating:       '',
                    release_date: m.release_date || null,
                    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                    trailer_url:  null,
                    status:       'coming_soon',
                    created_at:   new Date().toISOString(),
                };
            });
        } catch (err) {
            console.error('[Movies] TMDB Upcoming fetch failed:', err.message);
            return [];
        }
    }

})();
