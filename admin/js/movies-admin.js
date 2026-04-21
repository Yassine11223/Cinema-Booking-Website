/**
 * movies-admin.js
 * ───────────────
 * Full CRUD for movies via the backend API.
 *   1) Load movies from GET /api/movies
 *   2) "Add Manually" — POST /api/movies
 *   3) "Edit" — PUT /api/movies/:id
 *   4) "Delete" — DELETE /api/movies/:id
 *   5) "Import from TMDB" — fetch from TMDB, POST each to API
 *
 * Falls back to localStorage when backend is offline.
 * ALL functions are GLOBAL. ALL handlers use inline onclick/onsubmit.
 */

/* ═══ CONFIG ═══ */
var API_BASE     = 'http://localhost:5000/api';
var TMDB_API_KEY = '8b17a4f6956553f204d913b742122c1e';
var TMDB_BASE    = 'https://api.themoviedb.org/3';
var TMDB_IMG     = 'https://image.tmdb.org/t/p/w500';
var STORE_KEY    = 'scene_admin_movies_v5';

var GENRE_MAP = {
    28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
    99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
    27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',
    10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'
};

/* ═══ STATE ═══ */
var allMovies      = [];
var currentStatus  = 'all';
var currentGenre   = '';
var currentSearch  = '';
var viewMode       = 'grid';
var editingId      = null;
var deleteTargetId = null;
var backendOnline  = false;

/* ═══ HELPERS ═══ */
function _el(id) { return document.getElementById(id); }

function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getToken() {
    return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
}

function apiHeaders() {
    var token = getToken();
    var h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
}

/* ═══ LOCAL STORAGE FALLBACK ═══ */
function loadLocalMovies() {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    } catch(e) { return []; }
}

function saveLocalMovies() {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(allMovies));
    } catch(e) {}
}

/* ═══════════════════════════════════════════
   LOAD MOVIES FROM API
   ═══════════════════════════════════════════ */
function loadMovies() {
    _el('movies-loading').style.display = 'flex';
    _el('movies-grid').style.display = 'none';
    _el('movies-empty').style.display = 'none';

    fetch(API_BASE + '/movies', { headers: apiHeaders() })
        .then(function(res) {
            if (!res.ok) throw new Error('API ' + res.status);
            return res.json();
        })
        .then(function(movies) {
            backendOnline = true;
            allMovies = movies;
            saveLocalMovies();
            _el('movies-loading').style.display = 'none';
            applyFilters();
            updateStats();
            updateBadge('Connected');
        })
        .catch(function(err) {
            console.warn('Backend offline, using local data:', err.message);
            backendOnline = false;
            allMovies = loadLocalMovies();
            _el('movies-loading').style.display = 'none';
            applyFilters();
            updateStats();
            updateBadge('Offline');
        });
}

/* ═══════════════════════════════════════════
   IMPORT FROM TMDB
   ═══════════════════════════════════════════ */
function importFromTMDB() {
    _el('movies-loading').style.display = 'flex';
    _el('movies-grid').style.display = 'none';
    _el('movies-empty').style.display = 'none';
    updateBadge('Fetching…');

    var url1 = TMDB_BASE + '/movie/now_playing?api_key=' + TMDB_API_KEY + '&language=en-US&page=1';
    var url2 = TMDB_BASE + '/movie/upcoming?api_key=' + TMDB_API_KEY + '&language=en-US&page=1';

    Promise.all([
        fetch(url1).then(function(r){ return r.json(); }),
        fetch(url2).then(function(r){ return r.json(); })
    ]).then(function(results) {
        var np = (results[0] && results[0].results) || [];
        var up = (results[1] && results[1].results) || [];

        // Check which titles already exist in DB to avoid duplicates
        var existingTitles = {};
        allMovies.forEach(function(m) {
            existingTitles[m.title.toLowerCase().trim()] = true;
        });

        var tmdbList = [];
        var seen = {};
        np.concat(up).forEach(function(tm) {
            if (seen[tm.id]) return;
            seen[tm.id] = true;
            var titleKey = (tm.title || '').toLowerCase().trim();
            if (existingTitles[titleKey]) return; // skip duplicates
            tmdbList.push(normalizeTmdb(tm));
        });

        if (tmdbList.length === 0) {
            _el('movies-loading').style.display = 'none';
            applyFilters();
            updateBadge('Connected');
            showToast('No new movies to import — all are already in your catalogue.', 'info');
            return;
        }

        // Save each movie to the database
        var saved = 0;
        var errors = 0;
        var total = tmdbList.length;

        function saveNext(i) {
            if (i >= total) {
                // Done — reload from API
                showToast(saved + ' movies imported from TMDB!' + (errors > 0 ? ' (' + errors + ' failed)' : ''), saved > 0 ? 'success' : 'error');
                loadMovies();
                return;
            }

            var movieData = tmdbList[i];
            fetch(API_BASE + '/movies', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify(movieData)
            }).then(function(res) {
                if (res.ok) saved++;
                else errors++;
            }).catch(function() {
                errors++;
                // Fallback: add to local state
                allMovies.push(movieData);
            }).finally(function() {
                saveNext(i + 1);
            });
        }

        saveNext(0);

    }).catch(function(err) {
        console.error('TMDB fetch error:', err);
        _el('movies-loading').style.display = 'none';
        applyFilters();
        updateBadge('Error');
        showToast('Failed to fetch from TMDB. Check console.', 'error');
    });
}

function normalizeTmdb(tm) {
    var gid  = (tm.genre_ids && tm.genre_ids[0]) || 0;
    var rel  = tm.release_date || '';
    var now  = new Date().toISOString().slice(0,10);
    var stat = 'now_showing';
    if (rel > now) stat = 'coming_soon';
    else {
        var old = new Date(Date.now() - 120*86400000).toISOString().slice(0,10);
        if (rel && rel < old) stat = 'ended';
    }
    return {
        title:        tm.title || '',
        description:  tm.overview || '',
        genre:        GENRE_MAP[gid] || '',
        duration:     0,
        release_date: rel || null,
        poster_url:   tm.poster_path ? (TMDB_IMG + tm.poster_path) : null,
        trailer_url:  null,
        status:       stat
    };
}

function updateBadge(text) {
    var b = _el('tmdb-status');
    if (!b) return;
    var dot = text === 'Connected' ? 'tmdb-dot-live' : (text === 'Error' || text === 'Offline' ? 'tmdb-dot-offline' : '');
    b.innerHTML = '<span class="tmdb-dot ' + dot + '"></span> ' + text;
}

/* ═══════════════════════════════════════════
   ADD MANUALLY MODAL
   ═══════════════════════════════════════════ */
function openAddManuallyModal() {
    editingId = null;
    _el('modal-manual-heading').textContent = 'Add Movie Manually';
    _el('btn-save-label').textContent = 'Save Movie';
    _el('manual-movie-form').reset();
    _el('edit-movie-id').value = '';
    _el('manual-form-error').style.display = 'none';
    _el('modal-manual').classList.add('open');
    setTimeout(function(){ _el('m-title').focus(); }, 150);
}

function openEditMovie(id) {
    var m = null;
    for (var i = 0; i < allMovies.length; i++) {
        if (String(allMovies[i].id) === String(id)) { m = allMovies[i]; break; }
    }
    if (!m) return;
    editingId = id;
    _el('modal-manual-heading').textContent = 'Edit Movie';
    _el('btn-save-label').textContent = 'Update Movie';
    _el('edit-movie-id').value = id;
    _el('m-title').value        = m.title || '';
    _el('m-status').value       = m.status || 'now_showing';
    _el('m-description').value  = m.description || '';
    _el('m-genre').value        = m.genre || '';
    _el('m-duration').value     = m.duration || '';
    _el('m-release-date').value = m.release_date ? String(m.release_date).substring(0,10) : '';
    _el('m-poster-url').value   = m.poster_url || '';
    _el('m-trailer-url').value  = m.trailer_url || '';
    _el('manual-form-error').style.display = 'none';
    _el('modal-manual').classList.add('open');
    setTimeout(function(){ _el('m-title').focus(); }, 150);
}

function closeManualModal() {
    _el('modal-manual').classList.remove('open');
    editingId = null;
}

function saveManualMovie(e) {
    e.preventDefault();
    _el('manual-form-error').style.display = 'none';

    var title = (_el('m-title').value || '').trim();
    if (!title) {
        _el('manual-form-error').textContent = 'Movie title is required.';
        _el('manual-form-error').style.display = 'block';
        return;
    }

    var data = {
        title:        title,
        status:       _el('m-status').value || 'now_showing',
        description:  (_el('m-description').value || '').trim(),
        genre:        _el('m-genre').value || '',
        duration:     parseInt(_el('m-duration').value) || 0,
        release_date: _el('m-release-date').value || null,
        poster_url:   (_el('m-poster-url').value || '').trim() || null,
        trailer_url:  (_el('m-trailer-url').value || '').trim() || null
    };

    // Disable save button
    var saveBtn = _el('manual-movie-form').querySelector('.btn-modal-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.6'; }

    if (editingId) {
        // UPDATE
        fetch(API_BASE + '/movies/' + editingId, {
            method: 'PUT',
            headers: apiHeaders(),
            body: JSON.stringify(data)
        }).then(function(res) {
            if (!res.ok) throw new Error('Update failed: ' + res.status);
            return res.json();
        }).then(function(updated) {
            closeManualModal();
            showToast('Movie updated!', 'success');
            loadMovies(); // Reload from API
        }).catch(function(err) {
            console.error('Update error:', err);
            // Fallback: update locally
            for (var i = 0; i < allMovies.length; i++) {
                if (String(allMovies[i].id) === String(editingId)) {
                    for (var k in data) allMovies[i][k] = data[k];
                    break;
                }
            }
            saveLocalMovies();
            closeManualModal();
            applyFilters();
            updateStats();
            showToast('Movie updated locally (backend offline).', 'info');
        }).finally(function() {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }
        });
    } else {
        // CREATE
        fetch(API_BASE + '/movies', {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify(data)
        }).then(function(res) {
            if (!res.ok) throw new Error('Create failed: ' + res.status);
            return res.json();
        }).then(function(newMovie) {
            closeManualModal();
            showToast('Movie added!', 'success');
            loadMovies(); // Reload from API
        }).catch(function(err) {
            console.error('Create error:', err);
            // Fallback: add locally
            data.id = 'local_' + Date.now();
            allMovies.push(data);
            saveLocalMovies();
            closeManualModal();
            applyFilters();
            updateStats();
            showToast('Movie added locally (backend offline).', 'info');
        }).finally(function() {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }
        });
    }
}

/* ═══════════════════════════════════════════
   DELETE
   ═══════════════════════════════════════════ */
function openDeleteMovie(id, title) {
    deleteTargetId = id;
    _el('delete-movie-name').textContent = title || 'this movie';
    _el('modal-delete').classList.add('open');
}

function closeDeleteModal() {
    _el('modal-delete').classList.remove('open');
    deleteTargetId = null;
}

function confirmDelete() {
    if (!deleteTargetId) return;

    var btn = _el('modal-delete').querySelector('.btn-modal-danger');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…'; }

    fetch(API_BASE + '/movies/' + deleteTargetId, {
        method: 'DELETE',
        headers: apiHeaders()
    }).then(function(res) {
        if (!res.ok) throw new Error('Delete failed: ' + res.status);
        closeDeleteModal();
        showToast('Movie deleted.', 'success');
        loadMovies(); // Reload from API
    }).catch(function(err) {
        console.error('Delete error:', err);
        // Fallback: remove locally
        allMovies = allMovies.filter(function(m) { return String(m.id) !== String(deleteTargetId); });
        saveLocalMovies();
        closeDeleteModal();
        applyFilters();
        updateStats();
        showToast('Movie deleted locally (backend offline).', 'info');
    }).finally(function() {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete'; }
    });
}

/* ═══════════════════════════════════════════
   FILTERS & SEARCH
   ═══════════════════════════════════════════ */
function filterByStatus(status, btn) {
    currentStatus = status;
    document.querySelectorAll('.ftab').forEach(function(b){ b.classList.remove('ftab-active'); });
    if (btn) btn.classList.add('ftab-active');
    applyFilters();
}

function filterByGenre(genre) {
    currentGenre = genre;
    applyFilters();
}

function doSearch() {
    currentSearch = (_el('movie-search').value || '').toLowerCase().trim();
    applyFilters();
}

function applyFilters() {
    var filtered = allMovies.filter(function(m) {
        if (currentStatus !== 'all' && m.status !== currentStatus) return false;
        if (currentGenre && m.genre !== currentGenre) return false;
        if (currentSearch) {
            var hay = (m.title + ' ' + m.genre + ' ' + (m.description || '')).toLowerCase();
            if (hay.indexOf(currentSearch) === -1) return false;
        }
        return true;
    });
    renderGrid(filtered);
}

/* ═══════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════ */
function renderGrid(movies) {
    var grid  = _el('movies-grid');
    var empty = _el('movies-empty');
    grid.innerHTML = '';

    if (movies.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = viewMode === 'grid' ? 'grid' : 'block';
    grid.classList.toggle('movies-list-view', viewMode === 'list');

    movies.forEach(function(m) {
        grid.appendChild(viewMode === 'grid' ? makeCard(m) : makeRow(m));
    });
}

function makeCard(m) {
    var card = document.createElement('div');
    card.className = 'movie-card';

    var sLabel = {now_showing:'Now Showing', coming_soon:'Coming Soon', ended:'Ended'}[m.status] || '';
    var year   = m.release_date ? new Date(m.release_date).getFullYear() : '';
    var dur    = m.duration ? m.duration + ' min' : '';

    var poster;
    if (m.poster_url) {
        poster = '<img src="'+_esc(m.poster_url)+'" alt="'+_esc(m.title)+'" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
               + '<div class="movie-no-poster" style="display:none"><i class="fas fa-film"></i><span>No Poster</span></div>';
    } else {
        poster = '<div class="movie-no-poster"><i class="fas fa-film"></i><span>No Poster</span></div>';
    }

    var safeId    = _esc(String(m.id));
    var safeTitle = _esc(String(m.title).replace(/'/g, "\\'"));

    card.innerHTML =
        '<div class="movie-poster-wrap">' + poster +
            '<span class="movie-status-badge badge-' + m.status + '">' + sLabel + '</span>' +
            '<div class="movie-card-actions">' +
                '<button class="mc-action-btn mc-edit-btn" title="Edit" onclick="openEditMovie(\'' + safeId + '\')"><i class="fas fa-pen"></i></button>' +
                '<button class="mc-action-btn mc-delete-btn" title="Delete" onclick="openDeleteMovie(\'' + safeId + '\',\'' + safeTitle + '\')"><i class="fas fa-trash"></i></button>' +
            '</div>' +
        '</div>' +
        '<div class="movie-card-body">' +
            '<div class="movie-card-title">' + _esc(m.title) + '</div>' +
            '<div class="movie-card-meta">' +
                (year ? '<i class="fas fa-calendar-alt"></i> ' + year + ' ' : '') +
                (dur  ? '<i class="fas fa-clock"></i> ' + dur : '') +
            '</div>' +
            (m.genre ? '<div class="movie-card-genre">' + _esc(m.genre) + '</div>' : '') +
        '</div>';
    return card;
}

function makeRow(m) {
    var row = document.createElement('div');
    row.className = 'movie-list-row';
    var year   = m.release_date ? new Date(m.release_date).getFullYear() : '—';
    var sLabel = {now_showing:'Now Showing', coming_soon:'Coming Soon', ended:'Ended'}[m.status] || '';
    var safeId    = _esc(String(m.id));
    var safeTitle = _esc(String(m.title).replace(/'/g, "\\'"));

    row.innerHTML =
        '<div class="movie-list-thumb">' +
            (m.poster_url ? '<img src="'+_esc(m.poster_url)+'" loading="lazy">' : '<i class="fas fa-film"></i>') +
        '</div>' +
        '<div class="movie-list-info">' +
            '<div class="movie-list-title">' + _esc(m.title) + '</div>' +
            '<div class="movie-list-sub">' + _esc(m.genre||'—') + ' · ' + year + ' · ' + (m.duration ? m.duration+'min' : '—') +
            ' · <span class="movie-status-badge badge-' + m.status + '" style="position:static;font-size:9px;padding:2px 7px;">' + sLabel + '</span></div>' +
        '</div>' +
        '<div class="movie-list-actions">' +
            '<button class="mc-action-btn mc-edit-btn" title="Edit" onclick="openEditMovie(\'' + safeId + '\')"><i class="fas fa-pen"></i></button>' +
            '<button class="mc-action-btn mc-delete-btn" title="Delete" onclick="openDeleteMovie(\'' + safeId + '\',\'' + safeTitle + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>';
    return row;
}

/* ═══ STATS ═══ */
function updateStats() {
    _el('mstat-total').textContent   = allMovies.length;
    _el('mstat-showing').textContent = allMovies.filter(function(m){return m.status==='now_showing'}).length;
    _el('mstat-coming').textContent  = allMovies.filter(function(m){return m.status==='coming_soon'}).length;
    _el('mstat-ended').textContent   = allMovies.filter(function(m){return m.status==='ended'}).length;
}

/* ═══ VIEW TOGGLE ═══ */
function setView(mode) {
    viewMode = mode;
    _el('view-grid').classList.toggle('vtoggle-active', mode==='grid');
    _el('view-list').classList.toggle('vtoggle-active', mode==='list');
    applyFilters();
}

/* ═══ TOAST ═══ */
function showToast(msg, type) {
    var cont = _el('toast-container');
    if (!cont) return;
    var icons = {success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle'};
    var t = document.createElement('div');
    t.className = 'toast toast-' + (type||'info');
    t.innerHTML = '<i class="fas ' + (icons[type]||icons.info) + '"></i> ' + msg;
    cont.appendChild(t);
    setTimeout(function(){
        t.style.opacity = '0';
        t.style.transform = 'translateY(8px)';
        setTimeout(function(){ t.remove(); }, 400);
    }, 3200);
}

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
function initAdmin() {
    // Date badge
    var d = _el('today-date-text');
    if (d) d.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'});

    // Load movies from API (with fallback)
    loadMovies();

    // Escape key closes modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { closeManualModal(); closeDeleteModal(); }
    });

    // Click outside modal closes it
    _el('modal-manual').addEventListener('click', function(e) {
        if (e.target === _el('modal-manual')) closeManualModal();
    });
    _el('modal-delete').addEventListener('click', function(e) {
        if (e.target === _el('modal-delete')) closeDeleteModal();
    });
}

// Run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
