/* Admin showtime management backed by /api/shows, /api/movies, and /api/theaters. */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = (id) => document.getElementById(id);

    let movies = [];
    let theaters = [];
    let shows = [];
    let filtered = [];
    let editingId = null;

    function token() {
        return localStorage.getItem('adminToken') || '';
    }

    async function api(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `API request failed (${res.status})`);
        }
        return res.status === 204 ? null : res.json();
    }

    function normalize(show) {
        const dt = new Date(show.show_time);
        return {
            id: show.id,
            movie_id: idOf(show.movie_id),
            movie_title: show.movie_title || movieTitle(show.movie_id),
            movie_genre: show.genre || '',
            theater_id: idOf(show.theater_id),
            theater_name: show.theater_name || theaterName(show.theater_id),
            screen_type: screenType(show),
            capacity: Number(show.capacity || theaterById(show.theater_id)?.capacity || 0),
            booked: Number(show.booked || 0),
            show_date: Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10),
            show_clock: Number.isNaN(dt.getTime()) ? '' : dt.toTimeString().slice(0, 5),
            show_time: show.show_time,
            price: Number(show.price || 0),
            status: statusFor(show, dt),
        };
    }

    function movieTitle(id) {
        return movies.find(m => idOf(m) === idOf(id))?.title || 'Unknown movie';
    }

    function theaterById(id) {
        return theaters.find(t => idOf(t) === idOf(id));
    }

    function theaterName(id) {
        return theaterById(id)?.name || 'Unknown theater';
    }

    function screenType(show) {
        const theater = theaterById(show.theater_id);
        const raw = (show.screen_type || theater?.screen_type || theater?.name || 'standard').toLowerCase();
        if (raw.includes('imax')) return 'imax';
        if (raw.includes('dolby')) return 'dolby';
        if (raw.includes('vip') || raw.includes('deluxe')) return 'deluxe';
        return 'standard';
    }

    function idOf(value) {
        if (!value) return '';
        return String(value.id || value._id || value);
    }

    function statusFor(show, dt) {
        if (Number.isNaN(dt.getTime())) return 'upcoming';
        if (dt < new Date()) return 'ended';
        if (show.capacity && show.booked >= show.capacity) return 'sold-out';
        return 'active';
    }

    async function load() {
        try {
            [movies, theaters] = await Promise.all([
                api('/movies'),
                api('/theaters'),
            ]);
            const data = await api('/shows');
            shows = data.map(normalize);
            filter();
            stats();
        } catch (err) {
            shows = [];
            filtered = [];
            render();
            stats();
            toast(err.message, 'err');
        }
    }

    function stats() {
        const today = new Date().toISOString().slice(0, 10);
        const todayShows = shows.filter(s => s.show_date === today).length;
        const active = shows.filter(s => s.status === 'active').length;
        const avgOcc = shows.length
            ? Math.round(shows.reduce((sum, s) => sum + (s.capacity ? (s.booked / s.capacity) * 100 : 0), 0) / shows.length)
            : 0;

        $('s-total').textContent = shows.length;
        $('s-today').textContent = todayShows;
        $('s-active').textContent = active;
        $('s-occ').textContent = `${avgOcc}%`;
    }

    function render() {
        const tbody = $('tbody');
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><i class="fas fa-calendar-times"></i>No shows found</div></td></tr>';
            $('tbl-foot').textContent = 'No shows to display';
            return;
        }

        tbody.innerHTML = filtered.map(show => {
            const pct = show.capacity ? Math.round((show.booked / show.capacity) * 100) : 0;
            const fill = pct >= 85 ? 'high' : pct >= 50 ? 'mid' : 'low';
            const dateLabel = show.show_date
                ? new Date(`${show.show_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : '-';
            return `
                <tr>
                    <td><div class="mov"><div class="mov-poster"><i class="fas fa-film"></i></div><div><div class="mov-title">${esc(show.movie_title)}</div><div class="mov-genre">${esc(show.movie_genre || '')}</div></div></div></td>
                    <td><div style="font-weight:500;color:#fff">${dateLabel}</div><div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px">${esc(show.show_clock)}</div></td>
                    <td><div style="margin-bottom:4px">${esc(show.theater_name)}</div><span class="scr scr-${esc(show.screen_type)}">${esc(show.screen_type)}</span></td>
                    <td><span class="price">${show.price.toLocaleString()} EGP</span></td>
                    <td><div class="occ"><div class="occ-bar"><div class="occ-fill occ-${fill}" style="width:${pct}%"></div></div><span class="occ-pct">${pct}%</span></div><div style="font-size:11px;color:rgba(255,255,255,0.4)">${show.booked}/${show.capacity}</div></td>
                    <td><span class="bdg bdg-${esc(show.status)}">${esc(show.status.replace('-', ' '))}</span></td>
                    <td><div class="acts"><button class="act" data-action="edit" data-id="${show.id}" title="Edit"><i class="fas fa-pen"></i></button><button class="act" data-action="duplicate" data-id="${show.id}" title="Duplicate"><i class="fas fa-copy"></i></button><button class="act act-d" data-action="delete" data-id="${show.id}" title="Delete"><i class="fas fa-trash"></i></button></div></td>
                </tr>`;
        }).join('');

        $('tbl-foot').textContent = `Showing ${filtered.length} of ${shows.length} shows`;
    }

    function filter() {
        const q = $('f-search').value.toLowerCase().trim();
        const date = $('f-date').value;
        const screen = $('f-screen').value;
        const status = $('f-status').value;
        filtered = shows.filter(show => {
            if (q && !show.movie_title.toLowerCase().includes(q)) return false;
            if (date && show.show_date !== date) return false;
            if (screen && show.screen_type !== screen) return false;
            if (status && show.status !== status) return false;
            return true;
        });
        filtered.sort((a, b) => `${a.show_date} ${a.show_clock}`.localeCompare(`${b.show_date} ${b.show_clock}`));
        render();
    }

    function openModal() {
        $('modal-bg').classList.add('open');
    }

    function closeModal() {
        $('modal-bg').classList.remove('open');
        editingId = null;
    }

    function openForm(show = null) {
        editingId = show?.id || null;
        $('m-title').textContent = editingId ? 'Edit Show' : 'Add New Show';
        const movieOptions = movies.map(m => `<option value="${idOf(m)}" ${idOf(show?.movie_id) === idOf(m) ? 'selected' : ''}>${esc(m.title)}</option>`).join('');
        const theaterOptions = theaters.map(t => `<option value="${idOf(t)}" ${idOf(show?.theater_id) === idOf(t) ? 'selected' : ''}>${esc(t.name)} (${esc(t.screen_type || 'standard')} - ${Number(t.capacity || 0)} seats)</option>`).join('');

        $('m-body').innerHTML = `
            <div class="fg"><label>Movie</label><select class="fc" id="fm-movie"><option value="">Select...</option>${movieOptions}</select></div>
            <div class="fg"><label>Theater</label><select class="fc" id="fm-hall"><option value="">Select...</option>${theaterOptions}</select></div>
            <div class="frow">
                <div class="fg"><label>Date</label><input type="date" class="fc" id="fm-date" value="${esc(show?.show_date || '')}"></div>
                <div class="fg"><label>Time</label><input type="time" class="fc" id="fm-time" value="${esc(show?.show_clock || '')}"></div>
            </div>
            <div class="fg"><label>Price (EGP)</label><input type="number" class="fc" id="fm-price" min="1" step="1" value="${esc(show?.price || '')}"></div>
        `;
        $('m-foot').innerHTML = `
            <button class="mb mb-cancel" id="btn-cancel-show">Cancel</button>
            <button class="mb mb-save" id="btn-save-show"><i class="fas fa-check"></i> ${editingId ? 'Update' : 'Create'}</button>
        `;
        $('btn-cancel-show').addEventListener('click', closeModal);
        $('btn-save-show').addEventListener('click', saveShow);
        openModal();
    }

    async function saveShow() {
        const movie_id = $('fm-movie').value;
        const theater_id = $('fm-hall').value;
        const date = $('fm-date').value;
        const time = $('fm-time').value;
        const price = Number($('fm-price').value);

        if (!movie_id) return toast('Select a movie', 'err');
        if (!theater_id) return toast('Select a theater', 'err');
        if (!date) return toast('Select a date', 'err');
        if (!time) return toast('Select a time', 'err');
        if (!price || price <= 0) return toast('Enter a valid price', 'err');

        const payload = {
            movie_id,
            theater_id,
            show_time: `${date}T${time}:00`,
            price,
        };

        try {
            if (editingId) {
                await api(`/shows/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
                toast('Show updated', 'ok');
            } else {
                await api('/shows', { method: 'POST', body: JSON.stringify(payload) });
                toast('Show created', 'ok');
            }
            closeModal();
            await load();
        } catch (err) {
            toast(err.message, 'err');
        }
    }

    function confirmDelete(show) {
        editingId = show.id;
        $('m-title').textContent = 'Delete Show';
        $('m-body').innerHTML = `<div class="dc"><i class="fas fa-exclamation-triangle"></i><p>Delete this show?</p><p><strong>${esc(show.movie_title)} - ${esc(show.show_date)} at ${esc(show.show_clock)}</strong></p><p style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:8px">This cannot be undone.</p></div>`;
        $('m-foot').innerHTML = '<button class="mb mb-cancel" id="btn-cancel-delete">Cancel</button><button class="mb mb-del" id="btn-confirm-delete"><i class="fas fa-trash"></i> Delete</button>';
        $('btn-cancel-delete').addEventListener('click', closeModal);
        $('btn-confirm-delete').addEventListener('click', deleteShow);
        openModal();
    }

    async function deleteShow() {
        try {
            await api(`/shows/${editingId}`, { method: 'DELETE' });
            toast('Show deleted', 'ok');
            closeModal();
            await load();
        } catch (err) {
            toast(err.message, 'err');
        }
    }

    function duplicateShow(show) {
        const next = new Date(`${show.show_date}T00:00:00`);
        next.setDate(next.getDate() + 1);
        openForm({
            ...show,
            id: null,
            show_date: next.toISOString().slice(0, 10),
        });
    }

    function bind() {
        $('btn-add').addEventListener('click', () => openForm());
        $('m-close').addEventListener('click', closeModal);
        $('modal-bg').addEventListener('click', e => {
            if (e.target === $('modal-bg')) closeModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });
        ['f-search', 'f-date', 'f-screen', 'f-status'].forEach(id => {
            $(id).addEventListener(id === 'f-search' ? 'input' : 'change', filter);
        });
        $('tbody').addEventListener('click', e => {
            const btn = e.target.closest('[data-action][data-id]');
            if (!btn) return;
            const show = shows.find(s => idOf(s.id) === idOf(btn.dataset.id));
            if (!show) return;
            if (btn.dataset.action === 'edit') openForm(show);
            if (btn.dataset.action === 'delete') confirmDelete(show);
            if (btn.dataset.action === 'duplicate') duplicateShow(show);
        });
    }

    function toast(message, type) {
        const old = document.querySelector('.toast-n');
        if (old) old.remove();
        const el = document.createElement('div');
        el.className = `toast-n ${type || 'ok'}`;
        el.innerHTML = `<i class="fas ${type === 'err' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${esc(message)}`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    function clock() {
        const el = $('clock');
        if (el) {
            el.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    }

    function esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', () => { bind(); clock(); load(); setInterval(clock, 60000); })
        : (bind(), clock(), load(), setInterval(clock, 60000));
})();
