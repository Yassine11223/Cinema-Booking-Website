/* Admin booking management backed by the real API only. */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = (sel) => document.querySelector(sel);

    let bookings = [];
    let filteredBookings = [];

    const tbody = $('#bookings-tbody');
    const emptyState = $('#empty-state');
    const tableSection = $('#table-container');
    const filterCount = $('#filter-count');
    const detailOverlay = $('#detail-overlay');
    const detailDrawer = $('#detail-drawer');
    const detailBody = $('#detail-body');
    const detailClose = $('#detail-close-btn');
    const drawerActions = $('.drawer-actions');
    const toastContainer = $('#toast-container');

    const controls = {
        search: $('#filter-search'),
        headerSearch: $('#header-search'),
        movie: $('#filter-movie'),
        theater: $('#filter-theater'),
        payment: $('#filter-payment'),
        booking: $('#filter-booking'),
        dateFrom: $('#filter-date-from'),
        dateTo: $('#filter-date-to'),
        sort: $('#filter-sort'),
        clear: $('#btn-clear-filters'),
        export: $('#btn-export'),
        refresh: $('#empty-refresh-btn'),
    };

    function token() {
        return localStorage.getItem('adminToken') || '';
    }

    function statusToPayment(status) {
        if (status === 'confirmed' || status === 'completed') return 'paid';
        if (status === 'cancelled') return 'refunded';
        return 'pending';
    }

    function seatLabels(seats) {
        return Array.isArray(seats)
            ? seats.map(s => `${s.row_label}${s.seat_number}`)
            : [];
    }

    function normalizeBooking(b) {
        const seats = seatLabels(b.seats);
        const amount = Number(b.total_price || 0);
        return {
            id: `BK-${b.id}`,
            backendId: b.id,
            customerName: b.user_name || 'Unknown customer',
            email: b.user_email || '',
            movie: b.movie_title || 'Unknown movie',
            theater: b.theater_name || 'Unknown theater',
            showtime: b.show_time || '',
            seats,
            tickets: seats.length,
            totalAmount: amount,
            paymentStatus: statusToPayment(b.status),
            bookingStatus: b.status || 'pending',
            createdAt: b.created_at || '',
        };
    }

    async function fetchBookings() {
        const authToken = token();
        if (!authToken) {
            throw new Error('Admin session is missing. Please log in again.');
        }

        const res = await fetch(`${API_BASE}/bookings`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Booking API failed with ${res.status}`);
        }

        const data = await res.json();
        bookings = data.map(normalizeBooking);
        filteredBookings = [...bookings];
    }

    function formatDateTime(value) {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    }

    function money(value) {
        return `${Number(value || 0).toLocaleString()} EGP`;
    }

    function badge(type, value) {
        return `<span class="status-badge status-badge--${value}">${value}</span>`;
    }

    function updateStats() {
        $('#stat-total').textContent = bookings.length;
        $('#stat-confirmed').textContent = bookings.filter(b => ['confirmed', 'completed'].includes(b.bookingStatus)).length;
        $('#stat-cancelled').textContent = bookings.filter(b => b.bookingStatus === 'cancelled').length;
        $('#stat-revenue').textContent = money(bookings
            .filter(b => b.paymentStatus === 'paid')
            .reduce((sum, b) => sum + b.totalAmount, 0));
        $('#stat-pending').textContent = bookings.filter(b => b.paymentStatus === 'pending').length;
        $('#stat-refunded').textContent = bookings.filter(b => b.paymentStatus === 'refunded').length;
    }

    function populateFilters() {
        fillSelect(controls.movie, 'All Movies', [...new Set(bookings.map(b => b.movie).filter(Boolean))]);
        fillSelect(controls.theater, 'All Theaters', [...new Set(bookings.map(b => b.theater).filter(Boolean))]);
    }

    function fillSelect(select, label, values) {
        if (!select) return;
        const current = select.value;
        select.innerHTML = `<option value="">${label}</option>` +
            values.sort().map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
        select.value = values.includes(current) ? current : '';
    }

    function applyFilters() {
        const search = (controls.search.value || controls.headerSearch.value || '').toLowerCase().trim();
        filteredBookings = bookings.filter(b => {
            if (search && !`${b.id} ${b.customerName} ${b.email} ${b.movie}`.toLowerCase().includes(search)) return false;
            if (controls.movie.value && b.movie !== controls.movie.value) return false;
            if (controls.theater.value && b.theater !== controls.theater.value) return false;
            if (controls.payment.value && b.paymentStatus !== controls.payment.value) return false;
            if (controls.booking.value && b.bookingStatus !== controls.booking.value) return false;
            if (controls.dateFrom.value && new Date(b.createdAt) < new Date(`${controls.dateFrom.value}T00:00:00`)) return false;
            if (controls.dateTo.value && new Date(b.createdAt) > new Date(`${controls.dateTo.value}T23:59:59`)) return false;
            return true;
        });

        switch (controls.sort.value) {
            case 'oldest':
                filteredBookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'highest':
                filteredBookings.sort((a, b) => b.totalAmount - a.totalAmount);
                break;
            case 'lowest':
                filteredBookings.sort((a, b) => a.totalAmount - b.totalAmount);
                break;
            default:
                filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        renderTable();
    }

    function renderTable() {
        const total = bookings.length;
        filterCount.innerHTML = `Showing <span>${filteredBookings.length}</span> of <span>${total}</span> bookings`;

        if (filteredBookings.length === 0) {
            tbody.innerHTML = '';
            tableSection.style.display = 'none';
            emptyState.style.display = '';
            return;
        }

        tableSection.style.display = '';
        emptyState.style.display = 'none';
        tbody.innerHTML = filteredBookings.map(b => `
            <tr>
                <td>${escapeHtml(b.id)}</td>
                <td>
                    <div class="customer-cell">
                        <strong>${escapeHtml(b.customerName)}</strong>
                        <span>${escapeHtml(b.email)}</span>
                    </div>
                </td>
                <td>${escapeHtml(b.movie)}</td>
                <td>${escapeHtml(b.theater)}</td>
                <td>${formatDateTime(b.showtime)}</td>
                <td>${b.seats.map(s => `<span class="seat-tag">${escapeHtml(s)}</span>`).join('') || '-'}</td>
                <td>${b.tickets}</td>
                <td>${money(b.totalAmount)}</td>
                <td>${badge('payment', b.paymentStatus)}</td>
                <td>${badge('booking', b.bookingStatus)}</td>
                <td>${formatDateTime(b.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn" data-action="view" data-id="${b.id}" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn" data-action="confirm" data-id="${b.id}" title="Confirm" ${b.bookingStatus === 'cancelled' ? 'disabled' : ''}><i class="fas fa-check"></i></button>
                        <button class="action-btn action-btn--danger" data-action="cancel" data-id="${b.id}" title="Cancel" ${b.bookingStatus === 'cancelled' ? 'disabled' : ''}><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        const footer = $('.page-info');
        if (footer) footer.innerHTML = `Showing <span>1</span> to <span>${filteredBookings.length}</span> of <span>${filteredBookings.length}</span> bookings`;
    }

    function openDrawer(id) {
        const b = bookings.find(item => item.id === id);
        if (!b) return;

        detailBody.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">Booking Overview</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="dl">Booking ID</span><span class="dv">${escapeHtml(b.id)}</span></div>
                    <div class="detail-item"><span class="dl">Status</span><span class="dv">${badge('booking', b.bookingStatus)}</span></div>
                    <div class="detail-item"><span class="dl">Booked At</span><span class="dv">${formatDateTime(b.createdAt)}</span></div>
                    <div class="detail-item"><span class="dl">Amount</span><span class="dv">${money(b.totalAmount)}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">Customer</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="dl">Name</span><span class="dv">${escapeHtml(b.customerName)}</span></div>
                    <div class="detail-item"><span class="dl">Email</span><span class="dv">${escapeHtml(b.email)}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">Movie & Seats</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="dl">Movie</span><span class="dv">${escapeHtml(b.movie)}</span></div>
                    <div class="detail-item"><span class="dl">Theater</span><span class="dv">${escapeHtml(b.theater)}</span></div>
                    <div class="detail-item"><span class="dl">Showtime</span><span class="dv">${formatDateTime(b.showtime)}</span></div>
                    <div class="detail-item"><span class="dl">Seats</span><span class="dv">${b.seats.map(escapeHtml).join(', ') || '-'}</span></div>
                </div>
            </div>
        `;

        drawerActions.innerHTML = `
            <button class="drawer-btn drawer-btn--checkin" data-action="confirm" data-id="${b.id}" ${b.bookingStatus === 'cancelled' ? 'disabled' : ''}><i class="fas fa-check-circle"></i> Confirm</button>
            <button class="drawer-btn drawer-btn--cancel" data-action="cancel" data-id="${b.id}" ${b.bookingStatus === 'cancelled' ? 'disabled' : ''}><i class="fas fa-ban"></i> Cancel</button>
        `;

        detailOverlay.classList.add('active');
        detailDrawer.classList.add('active');
    }

    function closeDrawer() {
        detailOverlay.classList.remove('active');
        detailDrawer.classList.remove('active');
    }

    async function updateBooking(action, id) {
        const booking = bookings.find(b => b.id === id);
        if (!booking) return;

        const endpoint = action === 'cancel' ? 'cancel' : 'confirm';
        const res = await fetch(`${API_BASE}/bookings/${booking.backendId}/${endpoint}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token()}` },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Could not ${endpoint} booking`);
        }

        await reload();
        showToast('success', `Booking ${id} ${endpoint === 'cancel' ? 'cancelled' : 'confirmed'}`);
        closeDrawer();
    }

    function bind() {
        [controls.search, controls.movie, controls.theater, controls.payment, controls.booking, controls.dateFrom, controls.dateTo, controls.sort]
            .forEach(el => el && el.addEventListener('input', applyFilters));
        [controls.movie, controls.theater, controls.payment, controls.booking, controls.dateFrom, controls.dateTo, controls.sort]
            .forEach(el => el && el.addEventListener('change', applyFilters));

        controls.headerSearch?.addEventListener('input', () => {
            controls.search.value = controls.headerSearch.value;
            applyFilters();
        });
        controls.clear?.addEventListener('click', () => {
            Object.values(controls).forEach(el => {
                if (el && ['INPUT', 'SELECT'].includes(el.tagName)) el.value = '';
            });
            applyFilters();
        });
        controls.refresh?.addEventListener('click', reload);
        controls.export?.addEventListener('click', exportCsv);
        detailClose?.addEventListener('click', closeDrawer);
        detailOverlay?.addEventListener('click', closeDrawer);

        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action][data-id]');
            if (!btn || btn.disabled) return;
            const { action, id } = btn.dataset;
            try {
                if (action === 'view') openDrawer(id);
                if (action === 'cancel' && confirm(`Cancel booking ${id}?`)) await updateBooking(action, id);
                if (action === 'confirm') await updateBooking(action, id);
            } catch (err) {
                showToast('error', err.message);
            }
        });
    }

    async function reload() {
        try {
            await fetchBookings();
            populateFilters();
            updateStats();
            applyFilters();
        } catch (err) {
            bookings = [];
            filteredBookings = [];
            updateStats();
            renderTable();
            showToast('error', err.message);
        }
    }

    function exportCsv() {
        const rows = [
            ['Booking ID', 'Customer', 'Email', 'Movie', 'Theater', 'Showtime', 'Seats', 'Tickets', 'Amount', 'Status', 'Created'],
            ...filteredBookings.map(b => [b.id, b.customerName, b.email, b.movie, b.theater, b.showtime, b.seats.join(' '), b.tickets, b.totalAmount, b.bookingStatus, b.createdAt]),
        ];
        const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `thehall-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function showToast(type, message) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast-item toast-item--${type}`;
        toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-circle-xmark' : 'fa-check-circle'}"></i><span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', () => { bind(); reload(); })
        : (bind(), reload());
})();
