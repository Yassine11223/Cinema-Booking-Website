/**
 * Real MongoDB-backed admin dashboard.
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';

    let dashboardData = {
        stats: {
            totalRevenue: 0,
            totalBookings: 0,
            totalUsers: 0,
            totalShows: 0,
            occupancyPct: 0,
        },
        recentBookings: [],
        topMovies: [],
        monthlyRevenue: [],
    };

    function getToken() {
        return localStorage.getItem('adminToken') || '';
    }

    function money(value) {
        return `${Number(value || 0).toLocaleString()} EGP`;
    }

    function setTodayDate() {
        const el = document.getElementById('today-date-text');
        if (!el) return;
        el.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    async function fetchDashboardData() {
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`,
            },
        });
        if (!res.ok) throw new Error(`Dashboard API failed (${res.status})`);
        dashboardData = await res.json();
    }

    function setStat(cardId, value, formatter = v => Number(v || 0).toLocaleString()) {
        const el = document.querySelector(`#${cardId} .stat-value`);
        if (!el) return;
        el.dataset.target = Number(value || 0);
        el.textContent = formatter(value);
    }

    function renderStats() {
        setStat('stat-revenue', dashboardData.stats.totalRevenue, money);
        setStat('stat-bookings', dashboardData.stats.totalBookings);
        setStat('stat-users', dashboardData.stats.totalUsers);
        setStat('stat-shows', dashboardData.stats.totalShows);

        document.querySelectorAll('.stat-change').forEach(el => {
            el.textContent = 'From MongoDB';
            el.classList.remove('stat-up', 'stat-down');
        });
    }

    function buildSparklines() {
        const values = {
            'spark-revenue': dashboardData.monthlyRevenue.map(item => item.amount),
            'spark-bookings': dashboardData.recentBookings.map((_item, index) => index + 1),
            'spark-users': [dashboardData.stats.totalUsers],
            'spark-shows': [dashboardData.stats.totalShows],
        };

        Object.entries(values).forEach(([id, data]) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = '';
            const max = Math.max(...data, 1);
            data.slice(-7).forEach(value => {
                const bar = document.createElement('div');
                bar.className = 'spark-bar';
                bar.style.height = `${Math.max(6, (value / max) * 44)}px`;
                container.appendChild(bar);
            });
        });
    }

    function buildBarChart() {
        const wrapper = document.getElementById('revenue-bar-chart');
        const labelsEl = document.getElementById('revenue-bar-labels');
        if (!wrapper || !labelsEl) return;
        wrapper.innerHTML = '';
        labelsEl.innerHTML = '';

        const data = dashboardData.monthlyRevenue || [];
        if (data.length === 0) {
            wrapper.innerHTML = '<div class="dashboard-empty-state">No report data available</div>';
            return;
        }

        const max = Math.max(...data.map(d => Number(d.amount || 0)), 1);
        data.forEach(item => {
            const pct = (Number(item.amount || 0) / max) * 100;
            const col = document.createElement('div');
            col.className = 'bar-col';
            col.innerHTML = `
                <span class="bar-amount-label">${money(item.amount)}</span>
                <div class="bar-fill${item.current ? ' bar-current' : ''}" style="height:${pct}%"></div>
            `;
            wrapper.appendChild(col);

            const lbl = document.createElement('span');
            lbl.className = 'bar-month-label';
            lbl.textContent = item.month;
            labelsEl.appendChild(lbl);
        });
    }

    function renderOccupancy() {
        const pct = Number(dashboardData.stats.occupancyPct || 0);
        const arc = document.getElementById('donut-fill-arc');
        const pctEl = document.getElementById('donut-pct');
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (arc) {
            const circumference = 2 * Math.PI * 44;
            arc.style.strokeDashoffset = circumference - (pct / 100) * circumference;
        }

        const legend = document.querySelector('.donut-legend');
        if (legend) {
            const available = Math.max(0, Number(dashboardData.stats.totalSeats || 0) - Number(dashboardData.stats.bookedSeats || 0));
            legend.innerHTML = `
                <div class="donut-legend-item"><span class="donut-legend-dot donut-legend-dot-filled"></span><span>Booked seats</span><strong>${dashboardData.stats.bookedSeats || 0}</strong></div>
                <div class="donut-legend-item"><span class="donut-legend-dot donut-legend-dot-empty"></span><span>Available</span><strong>${available}</strong></div>
            `;
        }
    }

    function renderRecentBookings() {
        const tbody = document.getElementById('recent-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!dashboardData.recentBookings.length) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="dashboard-empty-state">No bookings found</div></td></tr>';
            return;
        }

        dashboardData.recentBookings.slice(0, 7).forEach(booking => {
            const seats = booking.seat_labels?.length
                ? booking.seat_labels.join(', ')
                : (booking.seats || []).map(seat => seat.label).join(', ');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${String(booking.id || '').slice(-6).toUpperCase()}</td>
                <td><strong style="color:var(--text-primary)">${escapeHtml(booking.user_name || 'Unknown')}</strong></td>
                <td>${escapeHtml(booking.movie_title || 'Unknown')}</td>
                <td>${escapeHtml(seats || 'No seats')}</td>
                <td style="color:var(--text-primary);font-weight:500">${money(booking.total_price)}</td>
                <td><span class="booking-status status-${escapeHtml(booking.status || 'pending')}">${escapeHtml(booking.status || 'pending')}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    function renderTopMovies() {
        const list = document.getElementById('top-movies-list');
        if (!list) return;
        list.innerHTML = '';

        if (!dashboardData.topMovies.length) {
            list.innerHTML = '<div class="dashboard-empty-state">No report data available</div>';
            return;
        }

        dashboardData.topMovies.forEach(movie => {
            const item = document.createElement('div');
            item.className = 'top-movie-item';
            item.innerHTML = `
                <div class="top-movie-rank${movie.rank <= 3 ? ` rank-${movie.rank}` : ''}">${movie.rank}</div>
                <div class="top-movie-info">
                    <div class="top-movie-title">${escapeHtml(movie.title)}</div>
                    <div class="top-movie-meta">${movie.bookings} bookings</div>
                </div>
                <div class="top-movie-bar-wrapper">
                    <div class="top-movie-bar-bg">
                        <div class="top-movie-bar-fill" style="width:${movie.pct || 0}%"></div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    }

    function initRefreshBtn() {
        const btn = document.getElementById('admin-refresh');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            btn.classList.add('spinning');
            await renderDashboard();
            setTimeout(() => btn.classList.remove('spinning'), 300);
        });
    }

    function initNotifications() {
        const btn = document.getElementById('admin-notif');
        const panel = document.getElementById('notif-panel');
        const list = document.getElementById('notif-list');
        const dot = document.getElementById('notif-dot');
        const clearBtn = document.getElementById('notif-clear');
        if (!btn || !panel || !list) return;

        list.innerHTML = '<div class="notif-panel-empty"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
        if (dot) dot.classList.add('hidden');
        btn.addEventListener('click', e => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });
        clearBtn?.addEventListener('click', e => e.stopPropagation());
        document.addEventListener('click', () => panel.classList.remove('open'));
        panel.addEventListener('click', e => e.stopPropagation());
    }

    async function renderDashboard() {
        try {
            await fetchDashboardData();
        } catch (err) {
            dashboardData = {
                stats: { totalRevenue: 0, totalBookings: 0, totalUsers: 0, totalShows: 0, occupancyPct: 0 },
                recentBookings: [],
                topMovies: [],
                monthlyRevenue: [],
            };
            console.warn(err.message);
        }

        renderStats();
        buildSparklines();
        buildBarChart();
        renderOccupancy();
        renderRecentBookings();
        renderTopMovies();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function init() {
        setTodayDate();
        await renderDashboard();
        initRefreshBtn();
        initNotifications();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

