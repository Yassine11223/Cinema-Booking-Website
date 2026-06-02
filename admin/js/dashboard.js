/**
 * dashboard.js
 * Populates the admin dashboard with analytics data,
 * animated counters, bar chart, donut chart, recent bookings,
 * top movies, and misc UI interactions.
 */

(function () {
    'use strict';

    // Empty chart shape used until backend data is loaded.

    const MONTHLY_REVENUE = [
        { month: 'DEC', amount: 0 },
        { month: 'JAN', amount: 0 },
        { month: 'FEB', amount: 0 },
        { month: 'MAR', amount: 0 },
        { month: 'APR', amount: 0 },
        { month: 'MAY', amount: 0 },
        { month: 'JUN', amount: 0, current: true },
    ];

    const SPARKLINE_DATA = {
        revenue:  [0, 0, 0, 0, 0, 0, 0],
        bookings: [0, 0, 0, 0, 0, 0, 0],
        users:    [0, 0, 0, 0, 0, 0, 0],
        shows:    [0, 0, 0, 0, 0, 0, 0],
    };

    const OCCUPANCY_PCT = 0;

    // ── Init ────────────────────────────────────────────────────────────────────

    let dashboardData = {
        revenue: 0,
        bookings: 0,
        usersCnt: 0,
        showsCnt: 0,
        topMovies: [],
        recentBookings: [],
        monthlyRev: MONTHLY_REVENUE
    };

    async function fetchRealData() {
        try {
            const token = localStorage.getItem('adminToken') || '';
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

            const [mRes, uRes, bRes, sRes] = await Promise.all([
                fetch('http://localhost:5000/api/movies', { headers }).catch(() => null),
                fetch('http://localhost:5000/api/users', { headers }).catch(() => null),
                fetch('http://localhost:5000/api/bookings', { headers }).catch(() => null),
                fetch('http://localhost:5000/api/shows', { headers }).catch(() => null)
            ]);

            let movies = [];
            let users = [];
            let realBookings = [];
            let shows = [];

            if (mRes && mRes.ok) movies = await mRes.json();
            if (uRes && uRes.ok) users = await uRes.json();
            if (bRes && bRes.ok) realBookings = await bRes.json();
            if (sRes && sRes.ok) shows = await sRes.json();

            dashboardData.usersCnt = users.length;
            dashboardData.showsCnt = shows.length;
            dashboardData.bookings = realBookings.length;

            const paidBookings = realBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
            dashboardData.revenue = paidBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

            const movieBookingCounts = {};
            realBookings.forEach(b => {
                const title = b.movie_title || 'Unknown';
                movieBookingCounts[title] = (movieBookingCounts[title] || 0) + 1;
            });
            const sortedMovies = Object.entries(movieBookingCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            const maxBookings = sortedMovies.length > 0 ? sortedMovies[0][1] : 1;
            dashboardData.topMovies = sortedMovies.map(([title, count], i) => ({
                rank: i + 1,
                title,
                bookings: count,
                pct: Math.round((count / maxBookings) * 100),
            }));

            const statusMap = { confirmed: 'confirmed', pending: 'pending', cancelled: 'cancelled', completed: 'confirmed' };
            dashboardData.recentBookings = [...realBookings]
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .slice(0, 7)
                .map(b => ({
                    id: `#BK-${String(b.id).padStart(5, '0')}`,
                    customer: b.user_name || 'Unknown',
                    movie: b.movie_title || 'Unknown',
                    seats: Array.isArray(b.seats) ? b.seats.length : 0,
                    amount: `${parseFloat(b.total_price || 0).toLocaleString()} EGP`,
                    status: statusMap[b.status] || 'pending',
                }));

            const monthMap = {};
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            paidBookings.forEach(b => {
                const d = new Date(b.created_at);
                const key = monthNames[d.getMonth()];
                monthMap[key] = (monthMap[key] || 0) + parseFloat(b.total_price || 0);
            });
            dashboardData.monthlyRev = MONTHLY_REVENUE.map(item => ({
                ...item,
                amount: Math.round(monthMap[item.month] || 0),
                current: item.month === monthNames[new Date().getMonth()],
            }));

            console.log('Dashboard loaded real backend data', {
                movies: movies.length,
                users: users.length,
                bookings: realBookings.length,
                shows: shows.length,
            });
        } catch (err) {
            dashboardData = {
                revenue: 0,
                bookings: 0,
                usersCnt: 0,
                showsCnt: 0,
                topMovies: [],
                recentBookings: [],
                monthlyRev: MONTHLY_REVENUE
            };
            console.warn('Dashboard backend data unavailable:', err.message);
        }
    }
    async function init() {
        setTodayDate();
        await fetchRealData();
        
        // Update DOM targets before animating
        const revEl = document.querySelector('#stat-revenue .stat-value');
        const bkgEl = document.querySelector('#stat-bookings .stat-value');
        const usrEl = document.querySelector('#stat-users .stat-value');
        const shwEl = document.querySelector('#stat-shows .stat-value');

        if (revEl) revEl.dataset.target = dashboardData.revenue;
        if (bkgEl) bkgEl.dataset.target = dashboardData.bookings;
        if (usrEl) usrEl.dataset.target = dashboardData.usersCnt;
        if (shwEl) shwEl.dataset.target = dashboardData.showsCnt;

        buildSparklines();
        animateCounters();
        buildBarChart();
        animateDonut();
        populateRecentBookings();
        populateTopMovies();
        initRefreshBtn();
        initNotifications();
    }

    // ── Today's Date ────────────────────────────────────────────────────────────

    function setTodayDate() {
        const el = document.getElementById('today-date-text');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    // ── Sparklines ──────────────────────────────────────────────────────────────

    function buildSparklines() {
        const map = {
            'spark-revenue':  { data: SPARKLINE_DATA.revenue,  color: '#ef5350' },
            'spark-bookings': { data: SPARKLINE_DATA.bookings, color: '#9575cd' },
            'spark-users':    { data: SPARKLINE_DATA.users,    color: '#42a5f5' },
            'spark-shows':    { data: SPARKLINE_DATA.shows,    color: '#4db6ac' },
        };

        const max = data => Math.max(...data);

        Object.entries(map).forEach(([id, { data, color }]) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.style.color = color;
            const m = max(data);
            data.forEach(v => {
                const bar = document.createElement('div');
                bar.className = 'spark-bar';
                bar.style.height = `${(v / m) * 44}px`;
                bar.style.background = color;
                container.appendChild(bar);
            });
        });
    }

    // ── Animated Counters ───────────────────────────────────────────────────────

    function animateCounters() {
        const cards = document.querySelectorAll('[data-target]');
        cards.forEach(el => {
            const target  = parseInt(el.dataset.target, 10);
            const isUSD   = el.closest('.stat-card-revenue') !== null;
            const duration = 1400;
            const start    = performance.now();

            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const value = Math.floor(eased * target);
                el.textContent = isUSD ? `$${value.toLocaleString()}` : value.toLocaleString();
                if (progress < 1) requestAnimationFrame(update);
                else el.textContent = isUSD ? `$${target.toLocaleString()}` : target.toLocaleString();
            }

            requestAnimationFrame(update);
        });
    }

    // ── Bar Chart ───────────────────────────────────────────────────────────────

    function buildBarChart() {
        const wrapper      = document.getElementById('revenue-bar-chart');
        const labelsEl     = document.getElementById('revenue-bar-labels');
        if (!wrapper || !labelsEl) return;

        const monthlyRevenue = dashboardData.monthlyRev || MONTHLY_REVENUE;
        const max = Math.max(1, ...monthlyRevenue.map(d => d.amount));

        monthlyRevenue.forEach(item => {
            const pct = (item.amount / max) * 100;

            // Column
            const col = document.createElement('div');
            col.className = 'bar-col';

            const amtLabel = document.createElement('span');
            amtLabel.className = 'bar-amount-label';
            amtLabel.textContent = `$${(item.amount / 1000).toFixed(1)}k`;

            const bar = document.createElement('div');
            bar.className = 'bar-fill' + (item.current ? ' bar-current' : '');
            bar.style.height = '0%';
            bar.title = `${item.month}: $${item.amount.toLocaleString()}`;

            col.appendChild(amtLabel);
            col.appendChild(bar);
            wrapper.appendChild(col);

            // Animate height after paint
            requestAnimationFrame(() => {
                setTimeout(() => {
                    bar.style.transition = 'height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    bar.style.height = `${pct}%`;
                }, 100);
            });

            // Month label
            const lbl = document.createElement('span');
            lbl.className = 'bar-month-label';
            lbl.textContent = item.month;
            labelsEl.appendChild(lbl);
        });
    }

    // ── Donut Chart ─────────────────────────────────────────────────────────────

    function animateDonut() {
        const arc    = document.getElementById('donut-fill-arc');
        const pctEl  = document.getElementById('donut-pct');
        if (!arc || !pctEl) return;

        const circumference = 2 * Math.PI * 44; // r=44 → ~276.46
        const offset = circumference - (OCCUPANCY_PCT / 100) * circumference;

        // Counter animation
        const duration = 1200;
        const start    = performance.now();

        function update(now) {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            const current  = Math.floor(eased * OCCUPANCY_PCT);
            pctEl.textContent = `${current}%`;
            if (progress < 1) requestAnimationFrame(update);
            else pctEl.textContent = `${OCCUPANCY_PCT}%`;
        }

        requestAnimationFrame(update);

        // SVG arc
        setTimeout(() => {
            arc.style.strokeDashoffset = offset;
        }, 150);
    }

    // ── Recent Bookings Table ───────────────────────────────────────────────────

    function populateRecentBookings() {
        const tbody = document.getElementById('recent-bookings-tbody');
        if (!tbody) return;

        if (!dashboardData.recentBookings.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:18px;">No backend bookings found</td></tr>';
            return;
        }

        dashboardData.recentBookings.forEach(booking => {
            const row = document.createElement('tr');

            const statusClass = {
                confirmed: 'status-confirmed',
                pending:   'status-pending',
                cancelled: 'status-cancelled',
            }[booking.status] || '';

            const statusIcon = {
                confirmed: 'fa-check-circle',
                pending:   'fa-clock',
                cancelled: 'fa-times-circle',
            }[booking.status] || '';

            row.innerHTML = `
                <td>${booking.id}</td>
                <td><strong style="color:var(--text-primary)">${booking.customer}</strong></td>
                <td>${booking.movie}</td>
                <td>${booking.seats}</td>
                <td style="color:var(--text-primary);font-weight:500">${booking.amount}</td>
                <td>
                    <span class="booking-status ${statusClass}">
                        <i class="fas ${statusIcon}" style="font-size:10px"></i>
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // ── Top Movies List ─────────────────────────────────────────────────────────

    function populateTopMovies() {
        const list = document.getElementById('top-movies-list');
        if (!list) return;

        if (!dashboardData.topMovies.length) {
            list.innerHTML = '<div class="top-movie-item"><div class="top-movie-info"><div class="top-movie-title">No booking data</div><div class="top-movie-meta">Top movies will appear after real bookings exist</div></div></div>';
            return;
        }

        dashboardData.topMovies.forEach(movie => {
            const item = document.createElement('div');
            item.className = 'top-movie-item';

            const rankClass = movie.rank <= 3 ? ` rank-${movie.rank}` : '';

            item.innerHTML = `
                <div class="top-movie-rank${rankClass}">${movie.rank}</div>
                <div class="top-movie-info">
                    <div class="top-movie-title">${movie.title}</div>
                    <div class="top-movie-meta">${movie.bookings} bookings</div>
                </div>
                <div class="top-movie-bar-wrapper">
                    <div class="top-movie-bar-bg">
                        <div class="top-movie-bar-fill" style="width:0%" data-pct="${movie.pct}"></div>
                    </div>
                </div>
            `;

            list.appendChild(item);
        });

        // Animate bars
        setTimeout(() => {
            list.querySelectorAll('.top-movie-bar-fill').forEach(bar => {
                bar.style.width = `${bar.dataset.pct}%`;
            });
        }, 300);
    }

    // ── Refresh Button ──────────────────────────────────────────────────────────

    function initRefreshBtn() {
        const btn = document.getElementById('admin-refresh');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            btn.classList.add('spinning');
            
            // Re-fetch data
            await fetchRealData();
            
            // Reset and re-animate
            const revEl = document.querySelector('#stat-revenue .stat-value');
            const bkgEl = document.querySelector('#stat-bookings .stat-value');
            const usrEl = document.querySelector('#stat-users .stat-value');
            const shwEl = document.querySelector('#stat-shows .stat-value');
            
            if (revEl) { revEl.textContent = '0'; revEl.dataset.target = dashboardData.revenue; }
            if (bkgEl) { bkgEl.textContent = '0'; bkgEl.dataset.target = dashboardData.bookings; }
            if (usrEl) { usrEl.textContent = '0'; usrEl.dataset.target = dashboardData.usersCnt; }
            if (shwEl) { shwEl.textContent = '0'; shwEl.dataset.target = dashboardData.showsCnt; }

            animateCounters();
            
            // Re-render lists
            const tb = document.getElementById('recent-bookings-tbody');
            if (tb) tb.innerHTML = '';
            populateRecentBookings();
            
            const lm = document.getElementById('top-movies-list');
            if (lm) lm.innerHTML = '';
            populateTopMovies();

            setTimeout(() => {
                btn.classList.remove('spinning');
            }, 500);
        });
    }

    // ── Notification Panel ────────────────────────────────────────────────────

    function initNotifications() {
        const btn = document.getElementById('admin-notif');
        const panel = document.getElementById('notif-panel');
        const list = document.getElementById('notif-list');
        const clearBtn = document.getElementById('notif-clear');
        const dot = document.getElementById('notif-dot');
        if (!btn || !panel || !list) return;

        // Notification data
        const notifications = [];

        // Render notifications
        function renderNotifications() {
            list.innerHTML = '';
            const unreadCount = notifications.filter(n => n.unread).length;

            if (notifications.length === 0) {
                list.innerHTML = `
                    <div class="notif-panel-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications</p>
                    </div>
                `;
                if (dot) dot.classList.add('hidden');
                return;
            }

            if (unreadCount > 0) {
                if (dot) dot.classList.remove('hidden');
            } else {
                if (dot) dot.classList.add('hidden');
            }

            notifications.forEach((notif, idx) => {
                const item = document.createElement('div');
                item.className = 'notif-item' + (notif.unread ? ' unread' : '');
                item.innerHTML = `
                    <div class="notif-icon notif-${notif.type}">
                        <i class="fas ${notif.icon}"></i>
                    </div>
                    <div class="notif-content">
                        <div class="notif-text">${notif.text}</div>
                        <div class="notif-time">${notif.time}</div>
                    </div>
                `;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    notif.unread = false;
                    item.classList.remove('unread');
                    const remaining = notifications.filter(n => n.unread).length;
                    if (remaining === 0 && dot) dot.classList.add('hidden');
                });
                list.appendChild(item);
            });
        }

        renderNotifications();

        // Toggle panel
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target)) {
                panel.classList.remove('open');
            }
        });

        // Prevent panel clicks from closing
        panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Mark all read
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifications.forEach(n => n.unread = false);
                renderNotifications();
            });
        }
    }

    // Wrap initialization with DOMContentLoaded
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

