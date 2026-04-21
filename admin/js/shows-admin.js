/**
 * Shows Admin – CRUD management for showtimes
 * Uses demo data with localStorage persistence
 */
(function () {
    'use strict';

    // ============================================
    // DEMO DATA
    // ============================================
    const MOVIES = [
        { id: 1, title: 'Interstellar', genre: 'Sci-Fi', duration: '2h 49m' },
        { id: 2, title: 'The Dark Knight', genre: 'Action', duration: '2h 32m' },
        { id: 3, title: 'Inception', genre: 'Sci-Fi', duration: '2h 28m' },
        { id: 4, title: 'Oppenheimer', genre: 'Drama', duration: '3h 00m' },
        { id: 5, title: 'Dune: Part Two', genre: 'Sci-Fi', duration: '2h 46m' },
        { id: 6, title: 'Spider-Man: No Way Home', genre: 'Action', duration: '2h 28m' },
        { id: 7, title: 'The Batman', genre: 'Action', duration: '2h 56m' },
        { id: 8, title: 'Avatar: The Way of Water', genre: 'Sci-Fi', duration: '3h 12m' },
    ];

    const THEATERS = [
        { id: 1, name: 'Hall 1', type: 'standard', capacity: 150 },
        { id: 2, name: 'Hall 2', type: 'standard', capacity: 120 },
        { id: 3, name: 'IMAX Theater', type: 'imax', capacity: 300 },
        { id: 4, name: 'VIP Lounge', type: 'vip', capacity: 40 },
        { id: 5, name: '3D Theater', type: '3d', capacity: 180 },
        { id: 6, name: '4DX Experience', type: '4dx', capacity: 80 },
    ];

    const STORAGE_KEY = 'cinema_shows_admin_v1';

    function generateDemoShows() {
        const shows = [];
        const today = new Date();
        let id = 1;

        for (let d = -2; d < 7; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() + d);
            const dateStr = date.toISOString().split('T')[0];

            const showCount = 3 + Math.floor(Math.random() * 3);
            for (let s = 0; s < showCount; s++) {
                const movie = MOVIES[Math.floor(Math.random() * MOVIES.length)];
                const theater = THEATERS[Math.floor(Math.random() * THEATERS.length)];
                const hours = [10, 13, 16, 19, 21, 23][Math.floor(Math.random() * 6)];
                const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
                const booked = Math.floor(Math.random() * theater.capacity);

                const priceMap = { vip: 250, imax: 180, '4dx': 200, '3d': 150, standard: 120 };

                shows.push({
                    id: id++,
                    movie_id: movie.id,
                    movie_title: movie.title,
                    movie_genre: movie.genre,
                    theater_id: theater.id,
                    theater_name: theater.name,
                    screen_type: theater.type,
                    capacity: theater.capacity,
                    booked: booked,
                    show_date: dateStr,
                    show_time: String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0'),
                    price: priceMap[theater.type] || 120,
                    status: d < 0 ? 'ended' : booked >= theater.capacity ? 'sold-out' : 'active',
                });
            }
        }
        return shows;
    }

    function loadShows() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) { }
        const shows = generateDemoShows();
        saveShows(shows);
        return shows;
    }

    function saveShows(shows) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(shows)); } catch (_) { }
    }

    // ============================================
    // STATE
    // ============================================
    let allShows = [];
    let filteredShows = [];
    let editingId = null;

    // ============================================
    // DOM
    // ============================================
    const $ = (id) => document.getElementById(id);
    const tbody       = $('shows-tbody');
    const tableInfo   = $('table-info');
    const overlay     = $('sm-modal-overlay');
    const mTitle      = $('sm-modal-title');
    const mBody       = $('sm-modal-body');
    const mFoot       = $('sm-modal-foot');
    const fSearch     = $('filter-search');
    const fDate       = $('filter-date');
    const fScreen     = $('filter-screen');
    const fStatus     = $('filter-status');

    // ============================================
    // STATS
    // ============================================
    function renderStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayShows = allShows.filter(s => s.show_date === today);
        const activeShows = allShows.filter(s => s.status === 'active');
        const totalOcc = allShows.reduce((sum, s) => sum + (s.capacity > 0 ? (s.booked / s.capacity) * 100 : 0), 0);
        const avgOcc = allShows.length > 0 ? Math.round(totalOcc / allShows.length) : 0;

        $('stat-total').textContent = allShows.length;
        $('stat-today').textContent = todayShows.length;
        $('stat-active').textContent = activeShows.length;
        $('stat-occupancy').textContent = avgOcc + '%';
    }

    // ============================================
    // TABLE
    // ============================================
    function renderTable() {
        if (filteredShows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="sm-empty"><i class="fas fa-calendar-times"></i>No shows found</div></td></tr>';
            tableInfo.textContent = 'No shows to display';
            return;
        }

        tbody.innerHTML = filteredShows.map(show => {
            const pct = show.capacity > 0 ? Math.round((show.booked / show.capacity) * 100) : 0;
            const fill = pct >= 85 ? 'high' : pct >= 50 ? 'mid' : 'low';
            const scr = show.screen_type;

            let dateStr = show.show_date;
            try {
                const d = new Date(show.show_date + 'T00:00:00');
                dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            } catch (_) { }

            return '<tr>' +
                '<td><div class="sm-movie"><div class="sm-movie__poster"><i class="fas fa-film"></i></div><div><div class="sm-movie__title">' + show.movie_title + '</div><div class="sm-movie__genre">' + (show.movie_genre || '') + '</div></div></div></td>' +
                '<td><div style="font-weight:500;color:#fff">' + dateStr + '</div><div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px">' + show.show_time + '</div></td>' +
                '<td><div style="margin-bottom:4px">' + show.theater_name + '</div><span class="sm-screen sm-screen--' + scr + '">' + scr + '</span></td>' +
                '<td><span class="sm-price">' + show.price + ' EGP</span></td>' +
                '<td><div class="sm-occ"><div class="sm-occ__bar"><div class="sm-occ__fill sm-occ__fill--' + fill + '" style="width:' + pct + '%"></div></div><span class="sm-occ__pct">' + pct + '%</span></div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px">' + show.booked + '/' + show.capacity + '</div></td>' +
                '<td><span class="sm-badge sm-badge--' + show.status + '">' + show.status.replace('-', ' ') + '</span></td>' +
                '<td><div class="sm-actions"><button class="sm-act" title="Edit" data-action="edit" data-id="' + show.id + '"><i class="fas fa-pen"></i></button><button class="sm-act" title="Duplicate" data-action="dup" data-id="' + show.id + '"><i class="fas fa-copy"></i></button><button class="sm-act sm-act--del" title="Delete" data-action="del" data-id="' + show.id + '"><i class="fas fa-trash"></i></button></div></td>' +
                '</tr>';
        }).join('');

        tableInfo.textContent = 'Showing ' + filteredShows.length + ' of ' + allShows.length + ' shows';
    }

    // ============================================
    // FILTERS
    // ============================================
    function applyFilters() {
        const search = fSearch.value.toLowerCase().trim();
        const date = fDate.value;
        const screen = fScreen.value;
        const status = fStatus.value;

        filteredShows = allShows.filter(function (show) {
            if (search && show.movie_title.toLowerCase().indexOf(search) === -1) return false;
            if (date && show.show_date !== date) return false;
            if (screen && show.screen_type !== screen) return false;
            if (status && show.status !== status) return false;
            return true;
        });

        filteredShows.sort(function (a, b) {
            return (a.show_date + ' ' + a.show_time).localeCompare(b.show_date + ' ' + b.show_time);
        });

        renderTable();
    }

    // ============================================
    // MODAL
    // ============================================
    function openModal() { overlay.classList.add('open'); }
    function closeModal() { overlay.classList.remove('open'); editingId = null; }

    function openAddModal() {
        editingId = null;
        mTitle.textContent = 'Add New Show';
        renderShowForm({});
        openModal();
    }

    function openEditModal(id) {
        var show = allShows.find(function (s) { return s.id === id; });
        if (!show) return;
        editingId = id;
        mTitle.textContent = 'Edit Show';
        renderShowForm(show);
        openModal();
    }

    function openDeleteModal(id) {
        var show = allShows.find(function (s) { return s.id === id; });
        if (!show) return;
        editingId = id;
        mTitle.textContent = 'Delete Show';

        mBody.innerHTML =
            '<div class="sm-delconf">' +
            '<i class="fas fa-exclamation-triangle"></i>' +
            '<p>Are you sure you want to delete this show?</p>' +
            '<p><strong>' + show.movie_title + ' — ' + show.show_date + ' at ' + show.show_time + '</strong></p>' +
            '<p style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:8px">This action cannot be undone.</p>' +
            '</div>';

        mFoot.innerHTML =
            '<button class="sm-mbtn sm-mbtn--cancel" id="btn-cancel">Cancel</button>' +
            '<button class="sm-mbtn sm-mbtn--del" id="btn-confirm-del"><i class="fas fa-trash"></i> Delete</button>';

        $('btn-cancel').onclick = closeModal;
        $('btn-confirm-del').onclick = function () {
            allShows = allShows.filter(function (s) { return s.id !== editingId; });
            saveShows(allShows);
            closeModal();
            applyFilters();
            renderStats();
            toast('Show deleted successfully', 'success');
        };

        openModal();
    }

    function renderShowForm(show) {
        var movieOpts = MOVIES.map(function (m) {
            return '<option value="' + m.id + '"' + (show.movie_id === m.id ? ' selected' : '') + '>' + m.title + '</option>';
        }).join('');

        var theaterOpts = THEATERS.map(function (t) {
            return '<option value="' + t.id + '"' + (show.theater_id === t.id ? ' selected' : '') + '>' + t.name + ' (' + t.type.toUpperCase() + ' — ' + t.capacity + ' seats)</option>';
        }).join('');

        var statusOpts = ['active', 'upcoming', 'ended', 'sold-out'].map(function (s) {
            return '<option value="' + s + '"' + (show.status === s ? ' selected' : '') + '>' + s.replace('-', ' ').toUpperCase() + '</option>';
        }).join('');

        mBody.innerHTML =
            '<div class="sm-fg"><label for="f-movie">Movie</label><select class="sm-fc" id="f-movie"><option value="">Select a movie...</option>' + movieOpts + '</select></div>' +
            '<div class="sm-fg"><label for="f-theater">Theater / Hall</label><select class="sm-fc" id="f-theater"><option value="">Select a theater...</option>' + theaterOpts + '</select></div>' +
            '<div class="sm-frow">' +
            '<div class="sm-fg"><label for="f-date">Show Date</label><input type="date" class="sm-fc" id="f-date" value="' + (show.show_date || '') + '"></div>' +
            '<div class="sm-fg"><label for="f-time">Show Time</label><input type="time" class="sm-fc" id="f-time" value="' + (show.show_time || '') + '"></div>' +
            '</div>' +
            '<div class="sm-frow">' +
            '<div class="sm-fg"><label for="f-price">Price (EGP)</label><input type="number" class="sm-fc" id="f-price" min="0" step="5" value="' + (show.price || '') + '"></div>' +
            '<div class="sm-fg"><label for="f-status">Status</label><select class="sm-fc" id="f-status">' + statusOpts + '</select></div>' +
            '</div>';

        mFoot.innerHTML =
            '<button class="sm-mbtn sm-mbtn--cancel" id="btn-cancel">Cancel</button>' +
            '<button class="sm-mbtn sm-mbtn--save" id="btn-save"><i class="fas fa-check"></i> ' + (editingId ? 'Update' : 'Create') + ' Show</button>';

        $('btn-cancel').onclick = closeModal;
        $('btn-save').onclick = saveShow;

        // Auto-fill price on theater change
        $('f-theater').addEventListener('change', function (e) {
            var theater = THEATERS.find(function (t) { return t.id === parseInt(e.target.value); });
            if (theater && !editingId) {
                var prices = { vip: 250, imax: 180, '4dx': 200, '3d': 150, standard: 120 };
                $('f-price').value = prices[theater.type] || 120;
            }
        });
    }

    function saveShow() {
        var movieId = parseInt($('f-movie').value);
        var theaterId = parseInt($('f-theater').value);
        var date = $('f-date').value;
        var time = $('f-time').value;
        var price = parseInt($('f-price').value);
        var status = $('f-status').value;

        if (!movieId) { toast('Please select a movie', 'error'); return; }
        if (!theaterId) { toast('Please select a theater', 'error'); return; }
        if (!date) { toast('Please select a date', 'error'); return; }
        if (!time) { toast('Please select a time', 'error'); return; }
        if (!price || price <= 0) { toast('Please enter a valid price', 'error'); return; }

        var movie = MOVIES.find(function (m) { return m.id === movieId; });
        var theater = THEATERS.find(function (t) { return t.id === theaterId; });

        if (editingId) {
            var idx = -1;
            for (var i = 0; i < allShows.length; i++) {
                if (allShows[i].id === editingId) { idx = i; break; }
            }
            if (idx >= 0) {
                allShows[idx].movie_id = movieId;
                allShows[idx].movie_title = movie.title;
                allShows[idx].movie_genre = movie.genre;
                allShows[idx].theater_id = theaterId;
                allShows[idx].theater_name = theater.name;
                allShows[idx].screen_type = theater.type;
                allShows[idx].capacity = theater.capacity;
                allShows[idx].show_date = date;
                allShows[idx].show_time = time;
                allShows[idx].price = price;
                allShows[idx].status = status;
            }
            toast('Show updated successfully', 'success');
        } else {
            var newId = allShows.length > 0 ? Math.max.apply(null, allShows.map(function (s) { return s.id; })) + 1 : 1;
            allShows.push({
                id: newId,
                movie_id: movieId,
                movie_title: movie.title,
                movie_genre: movie.genre,
                theater_id: theaterId,
                theater_name: theater.name,
                screen_type: theater.type,
                capacity: theater.capacity,
                booked: 0,
                show_date: date,
                show_time: time,
                price: price,
                status: status,
            });
            toast('Show created successfully', 'success');
        }

        saveShows(allShows);
        closeModal();
        applyFilters();
        renderStats();
    }

    function duplicateShow(id) {
        var show = allShows.find(function (s) { return s.id === id; });
        if (!show) return;
        var newId = Math.max.apply(null, allShows.map(function (s) { return s.id; })) + 1;
        var nextDate = new Date(show.show_date + 'T00:00:00');
        nextDate.setDate(nextDate.getDate() + 1);

        allShows.push({
            id: newId,
            movie_id: show.movie_id,
            movie_title: show.movie_title,
            movie_genre: show.movie_genre,
            theater_id: show.theater_id,
            theater_name: show.theater_name,
            screen_type: show.screen_type,
            capacity: show.capacity,
            booked: 0,
            show_date: nextDate.toISOString().split('T')[0],
            show_time: show.show_time,
            price: show.price,
            status: 'active',
        });

        saveShows(allShows);
        applyFilters();
        renderStats();
        toast('Show duplicated to next day', 'success');
    }

    // ============================================
    // TOAST
    // ============================================
    function toast(message, type) {
        var existing = document.querySelector('.sm-toast');
        if (existing) existing.remove();

        var el = document.createElement('div');
        el.className = 'sm-toast sm-toast--' + (type || 'success');
        var icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
        el.innerHTML = '<i class="fas ' + icon + '"></i> <span>' + message + '</span>';
        document.body.appendChild(el);

        requestAnimationFrame(function () { el.classList.add('show'); });
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () { el.remove(); }, 400);
        }, 3000);
    }

    // ============================================
    // EVENTS
    // ============================================
    function bind() {
        $('btn-add-show').addEventListener('click', openAddModal);

        $('sm-modal-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeModal();
        });

        // Table actions (delegated)
        tbody.addEventListener('click', function (e) {
            var btn = e.target.closest('.sm-act');
            if (!btn) return;
            var action = btn.getAttribute('data-action');
            var id = parseInt(btn.getAttribute('data-id'));
            if (action === 'edit') openEditModal(id);
            else if (action === 'del') openDeleteModal(id);
            else if (action === 'dup') duplicateShow(id);
        });

        fSearch.addEventListener('input', applyFilters);
        fDate.addEventListener('change', applyFilters);
        fScreen.addEventListener('change', applyFilters);
        fStatus.addEventListener('change', applyFilters);
    }

    // ============================================
    // CLOCK
    // ============================================
    function updateClock() {
        var el = $('current-time');
        if (el) {
            el.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        allShows = loadShows();
        bind();
        applyFilters();
        renderStats();
        updateClock();
        setInterval(updateClock, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
