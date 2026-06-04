/**
 * Admin bookings list.
 * Source of truth: MongoDB backend API only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = (sel) => document.querySelector(sel);

    let bookings = [];
    let filteredBookings = [];

    function esc(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function token() {
        return localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
    }

    async function fetchBookings() {
        const response = await fetch(`${API_BASE}/bookings`, {
            headers: token() ? { Authorization: `Bearer ${token()}` } : {},
        });
        if (!response.ok) throw new Error(`Bookings API returned ${response.status}`);
        const data = await response.json();
        return data.map((booking) => {
            const seats = booking.seat_labels || (booking.seats || []).map((seat) => seat.label || `${seat.row_label}${seat.seat_number}`);
            const seatCount = seats.length || 1;
            const total = Number(booking.total_price || 0);
            return {
                id: booking.id || booking._id,
                customerName: booking.user_name || 'Unknown',
                email: booking.user_email || '',
                movie: booking.movie_title || 'Unknown Movie',
                theater: booking.theater_name || 'Unknown Hall',
                showtime: booking.show_time || '',
                seats,
                tickets: seatCount,
                totalAmount: total,
                pricePerTicket: seatCount ? total / seatCount : 0,
                paymentStatus: booking.status === 'confirmed' || booking.status === 'completed' ? 'paid' : 'pending',
                bookingStatus: booking.status || 'pending',
                createdAt: booking.created_at || '',
            };
        });
    }

    function formatDate(value) {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatTime(value) {
        if (!value) return '-';
        return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function formatCurrency(value) {
        return `${Number(value || 0).toLocaleString()} EGP`;
    }

    function updateStats() {
        const total = bookings.length;
        const confirmed = bookings.filter((booking) => booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'completed').length;
        const cancelled = bookings.filter((booking) => booking.bookingStatus === 'cancelled').length;
        const pending = bookings.filter((booking) => booking.bookingStatus === 'pending').length;
        const revenue = bookings
            .filter((booking) => booking.paymentStatus === 'paid')
            .reduce((sum, booking) => sum + booking.totalAmount, 0);
        const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
        set('#stat-total', total.toLocaleString());
        set('#stat-confirmed', confirmed.toLocaleString());
        set('#stat-cancelled', cancelled.toLocaleString());
        set('#stat-pending', pending.toLocaleString());
        set('#stat-refunded', '0');
        set('#stat-revenue', formatCurrency(revenue));
    }

    function applyFilters() {
        const search = (($('#filter-search')?.value || $('#header-search')?.value || '')).toLowerCase().trim();
        const movie = $('#filter-movie')?.value || '';
        const theater = $('#filter-theater')?.value || '';
        const payment = $('#filter-payment')?.value || '';
        const status = $('#filter-booking')?.value || '';
        filteredBookings = bookings.filter((booking) => {
            if (search && !`${booking.id} ${booking.customerName} ${booking.email} ${booking.movie}`.toLowerCase().includes(search)) return false;
            if (movie && booking.movie !== movie) return false;
            if (theater && booking.theater !== theater) return false;
            if (payment && booking.paymentStatus !== payment) return false;
            if (status && booking.bookingStatus !== status) return false;
            return true;
        });
        renderTable();
    }

    function renderFilterOptions() {
        const movieSelect = $('#filter-movie');
        const theaterSelect = $('#filter-theater');
        if (movieSelect) {
            const current = movieSelect.value;
            movieSelect.innerHTML = '<option value="">All Movies</option>' + [...new Set(bookings.map((booking) => booking.movie))].sort().map((movie) => `<option value="${esc(movie)}">${esc(movie)}</option>`).join('');
            movieSelect.value = current;
        }
        if (theaterSelect) {
            const current = theaterSelect.value;
            theaterSelect.innerHTML = '<option value="">All Theaters</option>' + [...new Set(bookings.map((booking) => booking.theater))].sort().map((theater) => `<option value="${esc(theater)}">${esc(theater)}</option>`).join('');
            theaterSelect.value = current;
        }
    }

    function badge(type, value) {
        return `<span class="status-badge status-${esc(value)}">${esc(value)}</span>`;
    }

    function renderTable() {
        const tbody = $('#bookings-tbody');
        const empty = $('#empty-state');
        const table = $('#table-container');
        const count = $('#filter-count');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (count) count.textContent = `${filteredBookings.length} booking${filteredBookings.length === 1 ? '' : 's'}`;
        if (!filteredBookings.length) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (table) table.style.display = 'block';
        filteredBookings.forEach((booking) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>#BK-${esc(String(booking.id).slice(-6).toUpperCase())}</strong></td>
                <td>${esc(booking.customerName)}<br><small>${esc(booking.email)}</small></td>
                <td>${esc(booking.movie)}</td>
                <td><span>${formatDate(booking.showtime)}</span><br><small>${formatTime(booking.showtime)}</small></td>
                <td>${booking.seats.map((seat) => `<span class="seat-tag">${esc(seat)}</span>`).join('')}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
                <td>${badge('booking', booking.bookingStatus)} ${badge('payment', booking.paymentStatus)}</td>
                <td><button class="tbl-action-btn tbl-view" data-id="${esc(booking.id)}" title="View"><i class="fas fa-eye"></i></button></td>`;
            tbody.appendChild(row);
        });
    }

    function openDrawer(id) {
        const booking = bookings.find((item) => String(item.id) === String(id));
        const overlay = $('#detail-overlay');
        const drawer = $('#detail-drawer');
        const body = $('#detail-body');
        if (!booking || !overlay || !drawer || !body) return;
        body.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">Booking Overview</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="dl">Booking ID</span><span class="dv">#BK-${esc(String(booking.id).slice(-6).toUpperCase())}</span></div>
                    <div class="detail-item"><span class="dl">Customer</span><span class="dv">${esc(booking.customerName)}</span></div>
                    <div class="detail-item"><span class="dl">Email</span><span class="dv">${esc(booking.email)}</span></div>
                    <div class="detail-item"><span class="dl">Movie</span><span class="dv">${esc(booking.movie)}</span></div>
                    <div class="detail-item"><span class="dl">Theater</span><span class="dv">${esc(booking.theater)}</span></div>
                    <div class="detail-item"><span class="dl">Showtime</span><span class="dv">${formatDate(booking.showtime)} at ${formatTime(booking.showtime)}</span></div>
                    <div class="detail-item full-width"><span class="dl">Selected Seats</span><div class="drawer-seats">${booking.seats.map((seat) => `<span class="drawer-seat-tag">${esc(seat)}</span>`).join('')}</div></div>
                    <div class="detail-item"><span class="dl">Total</span><span class="dv">${formatCurrency(booking.totalAmount)}</span></div>
                    <div class="detail-item"><span class="dl">Status</span><span class="dv">${esc(booking.bookingStatus)}</span></div>
                </div>
            </div>`;
        overlay.classList.add('active');
        drawer.classList.add('active');
    }

    function closeDrawer() {
        $('#detail-overlay')?.classList.remove('active');
        $('#detail-drawer')?.classList.remove('active');
    }

    function bind() {
        ['#filter-search', '#header-search', '#filter-movie', '#filter-theater', '#filter-payment', '#filter-booking', '#filter-sort'].forEach((selector) => {
            const el = $(selector);
            if (el) el.addEventListener('input', applyFilters);
            if (el) el.addEventListener('change', applyFilters);
        });
        $('#btn-clear-filters')?.addEventListener('click', () => {
            ['#filter-search', '#header-search', '#filter-movie', '#filter-theater', '#filter-payment', '#filter-booking'].forEach((selector) => { const el = $(selector); if (el) el.value = ''; });
            applyFilters();
        });
        $('#bookings-tbody')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-id]');
            if (button) openDrawer(button.dataset.id);
        });
        $('#detail-close-btn')?.addEventListener('click', closeDrawer);
        $('#detail-overlay')?.addEventListener('click', closeDrawer);
    }

    async function init() {
        bind();
        try {
            bookings = await fetchBookings();
        } catch (error) {
            bookings = [];
            console.error('[Admin Bookings] Backend bookings failed:', error.message);
        }
        filteredBookings = [...bookings];
        renderFilterOptions();
        updateStats();
        applyFilters();
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
