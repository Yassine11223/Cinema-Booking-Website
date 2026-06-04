/**
 * Admin dashboard.
 * Source of truth: MongoDB backend APIs only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';

    function esc(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function token() {
        return localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
    }

    async function apiGet(path) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
            },
        });
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
        return response.json();
    }

    function setTodayDate() {
        const el = document.getElementById('today-date-text');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

    function setStat(cardId, value, currency) {
        const el = document.querySelector(`#${cardId} .stat-value`);
        if (!el) return;
        el.dataset.target = Number(value || 0);
        el.textContent = currency ? `${Number(value || 0).toLocaleString()} EGP` : Number(value || 0).toLocaleString();
    }

    function renderBars(items) {
        const wrapper = document.getElementById('revenue-bar-chart');
        const labels = document.getElementById('revenue-bar-labels');
        if (!wrapper || !labels) return;
        wrapper.innerHTML = '';
        labels.innerHTML = '';
        const data = items && items.length ? items : [];
        const max = Math.max(1, ...data.map((item) => Number(item.amount || 0)));
        data.forEach((item) => {
            const col = document.createElement('div');
            col.className = 'bar-col';
            col.innerHTML = `<span class="bar-amount-label">${Number(item.amount || 0).toLocaleString()} EGP</span><div class="bar-fill${item.current ? ' bar-current' : ''}" style="height:${Math.round((Number(item.amount || 0) / max) * 100)}%"></div>`;
            wrapper.appendChild(col);
            const label = document.createElement('span');
            label.className = 'bar-month-label';
            label.textContent = item.month;
            labels.appendChild(label);
        });
        if (!data.length) {
            wrapper.innerHTML = '<div style="color:var(--text-muted);padding:32px;">No revenue yet</div>';
        }
    }

    function renderDonut(occupancyPct) {
        const arc = document.getElementById('donut-fill-arc');
        const pct = document.getElementById('donut-pct');
        const value = Math.max(0, Math.min(100, Number(occupancyPct || 0)));
        if (pct) pct.textContent = `${value}%`;
        if (arc) {
            const circumference = 2 * Math.PI * 44;
            arc.style.strokeDashoffset = circumference - (value / 100) * circumference;
        }
    }

    function renderRecentBookings(bookings) {
        const tbody = document.getElementById('recent-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No bookings yet</td></tr>';
            return;
        }
        bookings.forEach((booking) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#BK-${esc(booking.id.slice(-6).toUpperCase())}</td>
                <td><strong style="color:var(--text-primary)">${esc(booking.customer)}</strong></td>
                <td>${esc(booking.movie)}</td>
                <td>${(booking.seats || []).map(esc).join(', ') || '-'}</td>
                <td style="color:var(--text-primary);font-weight:500">${Number(booking.amount || 0).toLocaleString()} EGP</td>
                <td><span class="booking-status status-${esc(booking.status)}">${esc(booking.status)}</span></td>`;
            tbody.appendChild(row);
        });
    }

    function renderTopMovies(movies) {
        const list = document.getElementById('top-movies-list');
        if (!list) return;
        list.innerHTML = '';
        if (!movies || movies.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted);padding:24px;">No booking data yet</div>';
            return;
        }
        movies.forEach((movie) => {
            const item = document.createElement('div');
            item.className = 'top-movie-item';
            item.innerHTML = `
                <div class="top-movie-rank${movie.rank <= 3 ? ` rank-${movie.rank}` : ''}">${movie.rank}</div>
                <div class="top-movie-info">
                    <div class="top-movie-title">${esc(movie.title)}</div>
                    <div class="top-movie-meta">${Number(movie.bookings || 0).toLocaleString()} bookings</div>
                </div>
                <div class="top-movie-bar-wrapper"><div class="top-movie-bar-bg"><div class="top-movie-bar-fill" style="width:${Number(movie.pct || 0)}%"></div></div></div>`;
            list.appendChild(item);
        });
    }

    function renderNotifications(stats) {
        const list = document.getElementById('notif-list');
        const dot = document.getElementById('notif-dot');
        if (!list) return;
        list.innerHTML = `
            <div class="notif-panel-empty">
                <i class="fas fa-database"></i>
                <p>${Number(stats.bookings || 0).toLocaleString()} real bookings in MongoDB</p>
            </div>`;
        if (dot) dot.classList.add('hidden');
    }

    async function loadDashboard() {
        const data = await apiGet('/admin/stats');
        const totals = data.totals || {};
        setStat('stat-revenue', totals.revenue, true);
        setStat('stat-bookings', totals.bookings, false);
        setStat('stat-users', totals.users, false);
        setStat('stat-shows', totals.showsToday, false);
        renderBars(data.monthlyRevenue || []);
        renderDonut(totals.occupancyPct);
        renderRecentBookings(data.recentBookings || []);
        renderTopMovies(data.topMovies || []);
        renderNotifications(totals);
    }

    function bind() {
        const refresh = document.getElementById('admin-refresh');
        if (refresh) {
            refresh.addEventListener('click', async () => {
                refresh.classList.add('spinning');
                try { await loadDashboard(); } finally { refresh.classList.remove('spinning'); }
            });
        }
        const notifBtn = document.getElementById('admin-notif');
        const panel = document.getElementById('notif-panel');
        if (notifBtn && panel) notifBtn.addEventListener('click', (event) => { event.stopPropagation(); panel.classList.toggle('open'); });
        document.addEventListener('click', () => panel?.classList.remove('open'));
    }

    async function init() {
        setTodayDate();
        bind();
        try {
            await loadDashboard();
        } catch (error) {
            setStat('stat-revenue', 0, true);
            setStat('stat-bookings', 0, false);
            setStat('stat-users', 0, false);
            setStat('stat-shows', 0, false);
            renderRecentBookings([]);
            renderTopMovies([]);
            renderBars([]);
            renderDonut(0);
            console.error('[Dashboard] Backend stats failed:', error.message);
        }
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
