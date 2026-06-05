/**
 * Real MongoDB-backed booking management.
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = id => document.getElementById(id);

    let bookings = [];
    let filtered = [];

    function token() {
        return localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    }

    function headers() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` };
    }

    async function loadBookings() {
        try {
            const res = await fetch(`${API_BASE}/bookings`, { headers: headers() });
            const data = await res.json().catch(() => []);
            if (!res.ok) throw new Error(data.message || `Bookings API failed (${res.status})`);
            bookings = Array.isArray(data) ? data : [];
        } catch (err) {
            toast(err.message || 'Could not load bookings from MongoDB.', 'error');
            bookings = [];
        }
        populateFilters();
        applyFilters();
        renderStats();
    }

    function populateFilters() {
        fillSelect('filter-movie', [...new Set(bookings.map(b => b.movie_title).filter(Boolean))]);
        fillSelect('filter-theater', [...new Set(bookings.map(b => b.theater_name).filter(Boolean))]);
    }

    function fillSelect(id, values) {
        const select = $(id);
        if (!select) return;
        const first = select.options[0]?.outerHTML || '<option value="">All</option>';
        select.innerHTML = first + values.sort().map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
    }

    function renderStats() {
        setText('stat-total', bookings.length);
        setText('stat-confirmed', bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length);
        setText('stat-cancelled', bookings.filter(b => b.status === 'cancelled').length);
        setText('stat-pending', bookings.filter(b => b.status === 'pending').length);
        setText('stat-refunded', bookings.filter(b => b.payment_status === 'refunded').length);
        const revenue = bookings
            .filter(b => b.status === 'confirmed' || b.status === 'completed')
            .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
        setText('stat-revenue', `${revenue.toLocaleString()} EGP`);
    }

    function applyFilters() {
        const q = (($('filter-search')?.value || $('header-search')?.value || '')).toLowerCase();
        const movie = $('filter-movie')?.value || '';
        const theater = $('filter-theater')?.value || '';
        const payment = $('filter-payment')?.value || '';
        const status = $('filter-booking')?.value || '';
        const from = $('filter-date-from')?.value || '';
        const to = $('filter-date-to')?.value || '';
        const sort = $('filter-sort')?.value || '';

        filtered = bookings.filter(booking => {
            const haystack = `${booking.id || ''} ${booking.user_name || ''} ${booking.user_email || ''} ${booking.movie_title || ''}`.toLowerCase();
            if (q && !haystack.includes(q)) return false;
            if (movie && booking.movie_title !== movie) return false;
            if (theater && booking.theater_name !== theater) return false;
            if (payment && (booking.payment_status || booking.status) !== payment) return false;
            if (status && booking.status !== status) return false;
            if (from && dateKey(booking.created_at) < from) return false;
            if (to && dateKey(booking.created_at) > to) return false;
            return true;
        });

        filtered.sort((a, b) => {
            if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sort === 'highest') return Number(b.total_price || 0) - Number(a.total_price || 0);
            if (sort === 'lowest') return Number(a.total_price || 0) - Number(b.total_price || 0);
            return new Date(b.created_at) - new Date(a.created_at);
        });

        renderTable();
    }

    function renderTable() {
        const tbody = $('bookings-tbody');
        const empty = $('empty-state');
        const table = $('table-container');
        if (!tbody) return;
        tbody.innerHTML = '';

        const count = $('filter-count');
        if (count) count.innerHTML = `Showing <span>${filtered.length}</span> of <span>${bookings.length}</span> bookings`;

        document.querySelectorAll('.page-info span').forEach((span, i) => {
            span.textContent = i === 0 ? (filtered.length ? 1 : 0) : filtered.length;
        });

        if (!filtered.length) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.style.display = 'none';

        filtered.forEach(booking => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${esc(String(booking.id || '').slice(-6).toUpperCase())}</td>
                <td><strong>${esc(booking.user_name || 'Unknown')}</strong><div class="muted">${esc(booking.user_email || '')}</div></td>
                <td>${esc(booking.movie_title || 'Unknown')}</td>
                <td>${esc(booking.theater_name || 'Unknown')}</td>
                <td>${formatDateTime(booking.show_time)}</td>
                <td>${esc(seatLabels(booking))}</td>
                <td>${ticketCount(booking)}</td>
                <td>${Number(booking.total_price || 0).toLocaleString()} EGP</td>
                <td>${esc(booking.payment_status || booking.status || 'pending')}</td>
                <td><span class="status-badge status-${esc(booking.status || 'pending')}">${esc(booking.status || 'pending')}</span></td>
                <td>${formatDateTime(booking.created_at)}</td>
                <td><button class="btn-view" data-id="${booking.id}"><i class="fas fa-eye"></i></button></td>
            `;
            tr.querySelector('[data-id]')?.addEventListener('click', () => openDetails(booking));
            tbody.appendChild(tr);
        });
    }

    function openDetails(booking) {
        const body = $('detail-body');
        if (!body) return;
        body.innerHTML = `
            <div class="detail-section">
                <h3>Booking</h3>
                <p><strong>ID:</strong> ${esc(booking.id)}</p>
                <p><strong>Status:</strong> ${esc(booking.status || 'pending')}</p>
                <p><strong>Seats:</strong> ${esc(seatLabels(booking))}</p>
                <p><strong>Tickets:</strong> ${ticketCount(booking)}</p>
                <p><strong>Total:</strong> ${Number(booking.total_price || 0).toLocaleString()} EGP</p>
            </div>
            <div class="detail-section">
                <h3>Customer</h3>
                <p><strong>Name:</strong> ${esc(booking.user_name || 'Unknown')}</p>
                <p><strong>Email:</strong> ${esc(booking.user_email || '')}</p>
            </div>
            <div class="detail-section">
                <h3>Show</h3>
                <p><strong>Movie:</strong> ${esc(booking.movie_title || 'Unknown')}</p>
                <p><strong>Theater:</strong> ${esc(booking.theater_name || 'Unknown')}</p>
                <p><strong>Showtime:</strong> ${formatDateTime(booking.show_time)}</p>
            </div>
        `;
        $('detail-overlay')?.classList.add('open');
        $('detail-drawer')?.classList.add('open');
    }

    function closeDetails() {
        $('detail-overlay')?.classList.remove('open');
        $('detail-drawer')?.classList.remove('open');
    }

    function exportCsv() {
        if (!filtered.length) {
            toast('No bookings found to export.', 'error');
            return;
        }
        const rows = [
            ['Booking ID', 'Customer', 'Email', 'Movie', 'Theater', 'Showtime', 'Seats', 'Tickets', 'Amount', 'Payment', 'Status', 'Booked At'],
            ...filtered.map(b => [
                b.id,
                b.user_name || '',
                b.user_email || '',
                b.movie_title || '',
                b.theater_name || '',
                b.show_time || '',
                seatLabels(b),
                ticketCount(b),
                b.total_price || 0,
                b.payment_status || b.status || '',
                b.status || '',
                b.created_at || '',
            ]),
        ];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function clearFilters() {
        ['header-search', 'filter-search', 'filter-movie', 'filter-theater', 'filter-payment', 'filter-booking', 'filter-date-from', 'filter-date-to', 'filter-sort']
            .forEach(id => { const el = $(id); if (el) el.value = ''; });
        applyFilters();
    }

    function seatLabels(booking) {
        if (booking.seat_labels?.length) return booking.seat_labels.join(', ');
        if (booking.seats?.length) return booking.seats.map(seat => seat.label || `${seat.row_label}${seat.seat_number}`).join(', ');
        return 'No seats';
    }

    function ticketCount(booking) {
        if (booking.seat_labels?.length) return booking.seat_labels.length;
        if (booking.seats?.length) return booking.seats.length;
        if (booking.seat_ids?.length) return booking.seat_ids.length;
        return 0;
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function dateKey(value) {
        return value ? new Date(value).toISOString().split('T')[0] : '';
    }

    function formatDateTime(value) {
        return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    }

    function toast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.textContent = msg;
        $('toast-container')?.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    function esc(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', () => {
        ['header-search', 'filter-search', 'filter-movie', 'filter-theater', 'filter-payment', 'filter-booking', 'filter-date-from', 'filter-date-to', 'filter-sort']
            .forEach(id => $(id)?.addEventListener('input', applyFilters));
        $('btn-clear-filters')?.addEventListener('click', clearFilters);
        $('empty-refresh-btn')?.addEventListener('click', loadBookings);
        $('btn-export')?.addEventListener('click', exportCsv);
        $('detail-close-btn')?.addEventListener('click', closeDetails);
        $('detail-overlay')?.addEventListener('click', closeDetails);
        loadBookings();
    });
})();
