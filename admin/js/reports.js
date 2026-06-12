/**
 * Real backend reports.
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = id => document.getElementById(id);
    let report = null;

    function token() {
        return localStorage.getItem('adminToken') || '';
    }

    async function loadReport() {
        try {
            const res = await fetch(`${API_BASE}/admin/reports`, {
                headers: { 'Authorization': `Bearer ${token()}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || `Reports API failed (${res.status})`);
            report = data;
        } catch (err) {
            report = null;
            toast(err.message || 'No report data available', 'error');
        }
        render();
    }

    function render() {
        const summary = report?.summary || {};
        setText('r-revenue', `${Number(summary.totalRevenue || 0).toLocaleString()} EGP`);
        setText('r-bookings', Number(summary.totalBookings || 0).toLocaleString());
        setText('r-movies', Number(summary.totalMovies || 0).toLocaleString());
        setText('r-users', Number(summary.totalUsers || 0).toLocaleString());

        const top = $('reports-top-movies');
        if (top) {
            const movies = report?.topMovies || [];
            top.innerHTML = movies.length
                ? movies.map(movie => `<div class="top-movie-item"><div class="top-movie-rank">${movie.rank}</div><div class="top-movie-info"><div class="top-movie-title">${esc(movie.title)}</div><div class="top-movie-meta">${movie.bookings} bookings</div></div></div>`).join('')
                : '<div class="dashboard-empty-state">No report data available</div>';
        }

        const tbody = $('reports-bookings');
        if (tbody) {
            const bookings = report?.bookings || [];
            tbody.innerHTML = bookings.length
                ? bookings.slice(0, 10).map(booking => `<tr><td>#${esc(String(booking.id || '').slice(-6).toUpperCase())}</td><td>${esc(booking.user_name || 'Unknown')}</td><td>${esc(booking.movie_title || 'Unknown')}</td><td>${esc(seatLabels(booking))}</td><td>${Number(booking.total_price || 0).toLocaleString()} EGP</td><td>${esc(booking.status || 'pending')}</td></tr>`).join('')
                : '<tr><td colspan="6"><div class="dashboard-empty-state">No bookings found</div></td></tr>';
        }
    }

    function exportCsv() {
        if (!report?.bookings?.length) {
            toast('No report data available', 'error');
            return;
        }
        const rows = [
            ['Booking ID', 'Customer', 'Movie', 'Seats', 'Total', 'Status', 'Booked At'],
            ...report.bookings.map(b => [b.id, b.user_name || '', b.movie_title || '', seatLabels(b), b.total_price || 0, b.status || '', b.created_at || '']),
        ];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function seatLabels(booking) {
        if (booking.seat_labels?.length) return booking.seat_labels.join(', ');
        if (booking.seats?.length) return booking.seats.map(seat => seat.label || `${seat.row_label}${seat.seat_number}`).join(', ');
        return 'No seats';
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
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
        $('reports-refresh')?.addEventListener('click', loadReport);
        $('reports-export')?.addEventListener('click', exportCsv);
        loadReport();
    });
})();

