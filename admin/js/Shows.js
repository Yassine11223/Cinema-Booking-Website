/**
 * Admin showtime management.
 * Source of truth: MongoDB backend APIs only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = (id) => document.getElementById(id);

    let movies = [];
    let theaters = [];
    let shows = [];
    let bookings = [];
    let filtered = [];
    let editingId = null;

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
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
        return response.json();
    }

    function normalizeShow(show) {
        const date = new Date(show.show_time);
        const theater = show.theater_id && typeof show.theater_id === 'object' ? show.theater_id : theaters.find((item) => String(item.id) === String(show.theater_id));
        const movie = show.movie_id && typeof show.movie_id === 'object' ? show.movie_id : movies.find((item) => String(item.id) === String(show.movie_id));
        const booked = bookings
            .filter((booking) => String(booking.show_id?._id || booking.show_id || booking.backendShowId || '') === String(show.id || show._id))
            .reduce((sum, booking) => sum + (booking.seats?.length || 0), 0);
        const screen = (theater?.screen_type || theater?.name || 'standard').toLowerCase().includes('imax')
            ? 'imax'
            : (theater?.name || '').toLowerCase().includes('dolby')
                ? 'dolby'
                : (theater?.screen_type || 'standard');
        return {
            id: show.id || show._id,
            movie_id: movie?.id || movie?._id || show.movie_id?._id || show.movie_id,
            movie_title: show.movie_title || movie?.title || 'Unknown Movie',
            movie_genre: movie?.genre || '',
            theater_id: theater?.id || theater?._id || show.theater_id?._id || show.theater_id,
            theater_name: show.theater_name || theater?.name || 'Unknown Hall',
            screen_type: screen,
            capacity: Number(theater?.capacity || show.capacity || 0),
            booked,
            show_date: date.toISOString().slice(0, 10),
            show_time: date.toTimeString().slice(0, 5),
            price: Number(show.price || 0),
            status: date < new Date() ? 'ended' : (booked >= Number(theater?.capacity || 0) && Number(theater?.capacity || 0) > 0 ? 'sold-out' : 'active'),
        };
    }

    async function loadData() {
        $('tbody').innerHTML = '<tr><td colspan="7"><div class="empty">Loading showtimes...</div></td></tr>';
        try {
            const [movieData, theaterData, showData, bookingData] = await Promise.all([
                api('/movies'),
                api('/theaters'),
                api('/shows'),
                api('/bookings').catch(() => []),
            ]);
            movies = movieData;
            theaters = theaterData;
            bookings = bookingData;
            shows = showData.map(normalizeShow);
        } catch (error) {
            shows = [];
            toast(`Unable to load backend showtimes: ${error.message}`, 'err');
        }
        applyFilters();
        renderStats();
    }

    function renderStats() {
        const today = new Date().toISOString().slice(0, 10);
        const totalCapacity = shows.reduce((sum, show) => sum + show.capacity, 0);
        const totalBooked = shows.reduce((sum, show) => sum + show.booked, 0);
        $('s-total').textContent = shows.length;
        $('s-today').textContent = shows.filter((show) => show.show_date === today).length;
        $('s-active').textContent = shows.filter((show) => show.status === 'active').length;
        $('s-occ').textContent = `${totalCapacity ? Math.round((totalBooked / totalCapacity) * 100) : 0}%`;
    }

    function applyFilters() {
        const search = ($('f-search').value || '').toLowerCase().trim();
        const date = $('f-date').value;
        const screen = $('f-screen').value;
        const status = $('f-status').value;
        filtered = shows.filter((show) => {
            if (search && !show.movie_title.toLowerCase().includes(search)) return false;
            if (date && show.show_date !== date) return false;
            if (screen && show.screen_type !== screen) return false;
            if (status && show.status !== status) return false;
            return true;
        }).sort((a, b) => `${a.show_date} ${a.show_time}`.localeCompare(`${b.show_date} ${b.show_time}`));
        renderTable();
    }

    function renderTable() {
        const tbody = $('tbody');
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><i class="fas fa-calendar-times"></i>No showtimes found</div></td></tr>';
            $('tbl-foot').textContent = 'No showtimes to display';
            return;
        }
        tbody.innerHTML = filtered.map((show) => {
            const pct = show.capacity ? Math.round((show.booked / show.capacity) * 100) : 0;
            const fill = pct >= 85 ? 'high' : pct >= 50 ? 'mid' : 'low';
            const dateLabel = new Date(`${show.show_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return `
                <tr>
                    <td><div class="mov"><div class="mov-poster"><i class="fas fa-film"></i></div><div><div class="mov-title">${esc(show.movie_title)}</div><div class="mov-genre">${esc(show.movie_genre)}</div></div></div></td>
                    <td><div style="font-weight:500;color:#fff">${dateLabel}</div><div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px">${esc(show.show_time)}</div></td>
                    <td><div style="margin-bottom:4px">${esc(show.theater_name)}</div><span class="scr scr-${esc(show.screen_type)}">${esc(show.screen_type)}</span></td>
                    <td><span class="price">${show.price.toLocaleString()} EGP</span></td>
                    <td><div class="occ"><div class="occ-bar"><div class="occ-fill occ-${fill}" style="width:${pct}%"></div></div><span class="occ-pct">${pct}%</span></div><div style="font-size:11px;color:rgba(255,255,255,0.4)">${show.booked}/${show.capacity}</div></td>
                    <td><span class="bdg bdg-${esc(show.status)}">${esc(show.status.replace('-', ' '))}</span></td>
                    <td><div class="acts"><button class="act" data-action="edit" data-id="${esc(show.id)}" title="Edit"><i class="fas fa-pen"></i></button><button class="act act-d" data-action="delete" data-id="${esc(show.id)}" title="Delete"><i class="fas fa-trash"></i></button></div></td>
                </tr>`;
        }).join('');
        $('tbl-foot').textContent = `Showing ${filtered.length} of ${shows.length} showtimes`;
    }

    function openModal() { $('modal-bg').classList.add('open'); }
    function closeModal() { $('modal-bg').classList.remove('open'); editingId = null; }

    function renderForm(show = {}) {
        const movieOptions = movies.map((movie) => `<option value="${esc(movie.id || movie._id)}"${String(show.movie_id || '') === String(movie.id || movie._id) ? ' selected' : ''}>${esc(movie.title)}</option>`).join('');
        const theaterOptions = theaters.map((theater) => `<option value="${esc(theater.id || theater._id)}"${String(show.theater_id || '') === String(theater.id || theater._id) ? ' selected' : ''}>${esc(theater.name)} (${Number(theater.capacity || 0)} seats)</option>`).join('');
        $('m-body').innerHTML = `
            <div class="fg"><label>Movie</label><select class="fc" id="fm-movie"><option value="">Select...</option>${movieOptions}</select></div>
            <div class="fg"><label>Theater</label><select class="fc" id="fm-hall"><option value="">Select...</option>${theaterOptions}</select></div>
            <div class="frow"><div class="fg"><label>Date</label><input type="date" class="fc" id="fm-date" value="${esc(show.show_date || '')}"></div><div class="fg"><label>Time</label><input type="time" class="fc" id="fm-time" value="${esc(show.show_time || '')}"></div></div>
            <div class="fg"><label>Price (EGP)</label><input type="number" class="fc" id="fm-price" min="0" step="5" value="${esc(show.price || '')}"></div>`;
        $('m-foot').innerHTML = `<button class="mb mb-cancel" id="modal-cancel">Cancel</button><button class="mb mb-save" id="modal-save"><i class="fas fa-check"></i> ${editingId ? 'Update' : 'Create'}</button>`;
        $('modal-cancel').onclick = closeModal;
        $('modal-save').onclick = saveShow;
    }

    function addShow() {
        editingId = null;
        $('m-title').textContent = 'Add New Show';
        renderForm();
        openModal();
    }

    function editShow(id) {
        const show = shows.find((item) => String(item.id) === String(id));
        if (!show) return;
        editingId = id;
        $('m-title').textContent = 'Edit Show';
        renderForm(show);
        openModal();
    }

    async function saveShow() {
        const movie_id = $('fm-movie').value;
        const theater_id = $('fm-hall').value;
        const date = $('fm-date').value;
        const time = $('fm-time').value;
        const price = Number($('fm-price').value);
        if (!movie_id || !theater_id || !date || !time || !price) {
            toast('Movie, theater, date, time, and price are required', 'err');
            return;
        }
        const body = { movie_id, theater_id, show_time: new Date(`${date}T${time}:00`).toISOString(), price };
        try {
            if (editingId) await api(`/shows/${encodeURIComponent(editingId)}`, { method: 'PUT', body: JSON.stringify(body) });
            else await api('/shows', { method: 'POST', body: JSON.stringify(body) });
            closeModal();
            await loadData();
            toast(editingId ? 'Showtime updated' : 'Showtime created', 'ok');
        } catch (error) {
            toast(`Save failed: ${error.message}`, 'err');
        }
    }

    async function deleteShow(id) {
        if (!confirm('Delete this showtime?')) return;
        try {
            await api(`/shows/${encodeURIComponent(id)}`, { method: 'DELETE' });
            await loadData();
            toast('Showtime deleted', 'ok');
        } catch (error) {
            toast(`Delete failed: ${error.message}`, 'err');
        }
    }

    function toast(message, type) {
        const old = document.querySelector('.toast-n');
        if (old) old.remove();
        const el = document.createElement('div');
        el.className = `toast-n ${type || 'ok'}`;
        el.innerHTML = `<i class="fas ${type === 'err' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${esc(message)}`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
    }

    function updateClock() {
        const clock = $('clock');
        if (clock) clock.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function bind() {
        $('btn-add').onclick = addShow;
        $('m-close').onclick = closeModal;
        $('modal-bg').onclick = (event) => { if (event.target === $('modal-bg')) closeModal(); };
        $('f-search').oninput = applyFilters;
        $('f-date').onchange = applyFilters;
        $('f-screen').onchange = applyFilters;
        $('f-status').onchange = applyFilters;
        $('tbody').addEventListener('click', (event) => {
            const button = event.target.closest('.act');
            if (!button) return;
            if (button.dataset.action === 'edit') editShow(button.dataset.id);
            if (button.dataset.action === 'delete') deleteShow(button.dataset.id);
        });
    }

    async function init() {
        bind();
        updateClock();
        setInterval(updateClock, 60000);
        await loadData();
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
