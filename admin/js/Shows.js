/**
 * Real MongoDB-backed shows management.
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = id => document.getElementById(id);

    let allShows = [];
    let filtered = [];
    let movies = [];
    let theaters = [];
    let editId = null;

    function token() {
        return localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    }

    function headers() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` };
    }

    async function api(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: { ...headers(), ...(options.headers || {}) },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
        return data;
    }

    async function loadData() {
        try {
            [movies, theaters, allShows] = await Promise.all([
                api('/movies'),
                api('/theaters'),
                api('/shows'),
            ]);
        } catch (err) {
            toast(err.message || 'Could not load shows from MongoDB.', 'err');
            movies = [];
            theaters = [];
            allShows = [];
        }
        renderScreenFilter();
        filter();
        stats();
    }

    function renderScreenFilter() {
        const select = $('f-screen');
        if (!select) return;
        const types = [...new Set(theaters.map(t => t.screen_type).filter(Boolean))];
        select.innerHTML = '<option value="">All Screens</option>' + types.map(type => `<option value="${esc(type)}">${esc(type)}</option>`).join('');
    }

    function stats() {
        const today = new Date().toISOString().split('T')[0];
        const todays = allShows.filter(s => dateKey(s.show_time) === today);
        const active = allShows.filter(s => (s.status || 'active') === 'active');
        const occ = allShows.length
            ? Math.round(allShows.reduce((sum, s) => sum + occupancyPct(s), 0) / allShows.length)
            : 0;
        setText('s-total', allShows.length);
        setText('s-today', todays.length);
        setText('s-active', active.length);
        setText('s-occ', `${occ}%`);
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function render() {
        const tb = $('tbody');
        if (!tb) return;
        if (!filtered.length) {
            tb.innerHTML = '<tr><td colspan="7"><div class="empty"><i class="fas fa-calendar-times"></i>No shows found</div></td></tr>';
            setText('tbl-foot', 'No shows');
            return;
        }

        tb.innerHTML = filtered.map(show => {
            const theater = theaters.find(t => String(t.id) === String(show.theater_id));
            const pct = occupancyPct(show);
            const status = show.status || 'active';
            return `
                <tr>
                    <td><div class="mov"><div class="mov-poster"><i class="fas fa-film"></i></div><div><div class="mov-title">${esc(show.movie_title || 'Unknown movie')}</div><div class="mov-genre">${esc(show.genre || '')}</div></div></div></td>
                    <td><div style="font-weight:500;color:#fff">${formatDate(show.show_time)}</div><div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px">${formatTime(show.show_time)}</div></td>
                    <td><div style="margin-bottom:4px">${esc(show.theater_name || 'Unknown theater')}</div><span class="scr">${esc(theater?.screen_type || '')}</span></td>
                    <td><span class="price">${Number(show.price || 0).toLocaleString()} EGP</span></td>
                    <td><div class="occ"><div class="occ-bar"><div class="occ-fill" style="width:${pct}%"></div></div><span class="occ-pct">${pct}%</span></div></td>
                    <td><span class="bdg bdg-${esc(status)}">${esc(status)}</span></td>
                    <td><div class="acts"><button class="act" data-action="edit" data-id="${show.id}" title="Edit"><i class="fas fa-pen"></i></button><button class="act act-d" data-action="delete" data-id="${show.id}" title="Delete"><i class="fas fa-trash"></i></button></div></td>
                </tr>
            `;
        }).join('');

        tb.querySelectorAll('[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openForm(btn.dataset.id)));
        tb.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', () => deleteShow(btn.dataset.id)));
        setText('tbl-foot', `Showing ${filtered.length} of ${allShows.length} shows`);
    }

    function filter() {
        const q = ($('f-search')?.value || '').toLowerCase();
        const date = $('f-date')?.value || '';
        const screen = $('f-screen')?.value || '';
        const status = $('f-status')?.value || '';

        filtered = allShows.filter(show => {
            const theater = theaters.find(t => String(t.id) === String(show.theater_id));
            if (q && !(show.movie_title || '').toLowerCase().includes(q)) return false;
            if (date && dateKey(show.show_time) !== date) return false;
            if (screen && theater?.screen_type !== screen) return false;
            if (status && (show.status || 'active') !== status) return false;
            return true;
        }).sort((a, b) => new Date(a.show_time) - new Date(b.show_time));

        render();
    }

    function openForm(id = null) {
        editId = id;
        const show = allShows.find(s => String(s.id) === String(id)) || {};
        setText('m-title', editId ? 'Edit Show' : 'Add New Show');
        $('m-body').innerHTML = `
            <div class="fg"><label>Movie</label><select class="fc" id="fm-movie"><option value="">Select...</option>${movies.map(movie => `<option value="${movie.id}" ${String(show.movie_id) === String(movie.id) ? 'selected' : ''}>${esc(movie.title)}</option>`).join('')}</select></div>
            <div class="fg"><label>Theater</label><select class="fc" id="fm-hall"><option value="">Select...</option>${theaters.map(theater => `<option value="${theater.id}" ${String(show.theater_id) === String(theater.id) ? 'selected' : ''}>${esc(theater.name)} (${esc(theater.screen_type || 'standard')})</option>`).join('')}</select></div>
            <div class="frow"><div class="fg"><label>Date</label><input type="date" class="fc" id="fm-date" value="${show.show_time ? dateKey(show.show_time) : ''}"></div><div class="fg"><label>Time</label><input type="time" class="fc" id="fm-time" value="${show.show_time ? timeValue(show.show_time) : ''}"></div></div>
            <div class="frow"><div class="fg"><label>Price (EGP)</label><input type="number" class="fc" id="fm-price" min="0" step="5" value="${show.price || ''}"></div><div class="fg"><label>Status</label><select class="fc" id="fm-status"><option value="active" ${(show.status || 'active') === 'active' ? 'selected' : ''}>Active</option><option value="disabled" ${show.status === 'disabled' ? 'selected' : ''}>Disabled</option></select></div></div>
        `;
        $('m-foot').innerHTML = `<button class="mb mb-cancel" id="btn-cancel-modal">Cancel</button><button class="mb mb-save" id="btn-save-show"><i class="fas fa-check"></i> ${editId ? 'Update' : 'Create'}</button>`;
        $('btn-cancel-modal')?.addEventListener('click', closeModal);
        $('btn-save-show')?.addEventListener('click', saveShow);
        $('modal-bg')?.classList.add('open');
    }

    async function saveShow() {
        const movie_id = $('fm-movie')?.value;
        const theater_id = $('fm-hall')?.value;
        const date = $('fm-date')?.value;
        const time = $('fm-time')?.value;
        const price = Number($('fm-price')?.value || 0);
        const status = $('fm-status')?.value || 'active';

        if (!movie_id || !theater_id || !date || !time || price <= 0) {
            toast('Movie, theater, date, time, and price are required.', 'err');
            return;
        }

        const payload = { movie_id, theater_id, show_time: new Date(`${date}T${time}`).toISOString(), price, status };

        try {
            if (editId) await api(`/shows/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
            else await api('/shows', { method: 'POST', body: JSON.stringify(payload) });
            toast(editId ? 'Show updated' : 'Show created', 'ok');
            closeModal();
            await loadData();
        } catch (err) {
            toast(err.message, 'err');
        }
    }

    async function deleteShow(id) {
        if (!window.confirm('Delete this show?')) return;
        try {
            await api(`/shows/${id}`, { method: 'DELETE' });
            toast('Show deleted', 'ok');
            await loadData();
        } catch (err) {
            toast(err.message, 'err');
        }
    }

    function closeModal() {
        $('modal-bg')?.classList.remove('open');
        editId = null;
    }

    function occupancyPct(show) {
        if (!show.capacity) return 0;
        const booked = show.bookedSeats || show.booked_seats || 0;
        return Math.round((booked / show.capacity) * 100);
    }

    function dateKey(value) {
        return value ? new Date(value).toISOString().split('T')[0] : '';
    }

    function timeValue(value) {
        return value ? new Date(value).toTimeString().slice(0, 5) : '';
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-';
    }

    function formatTime(value) {
        return value ? new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
    }

    function clock() {
        const el = $('clock');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function toast(msg, type) {
        const old = document.querySelector('.toast-n');
        if (old) old.remove();
        const el = document.createElement('div');
        el.className = `toast-n ${type || 'ok'}`;
        el.innerHTML = `<i class="fas ${type === 'err' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${esc(msg)}`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
    }

    function esc(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('btn-add')?.addEventListener('click', () => openForm());
        $('m-close')?.addEventListener('click', closeModal);
        $('modal-bg')?.addEventListener('click', e => { if (e.target === $('modal-bg')) closeModal(); });
        ['f-search', 'f-date', 'f-screen', 'f-status'].forEach(id => $(id)?.addEventListener('input', filter));
        clock();
        setInterval(clock, 60000);
        loadData();
    });
})();
