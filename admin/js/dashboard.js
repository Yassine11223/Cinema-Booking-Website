/**
 * dashboard.js
 * Populates the admin dashboard with dummy analytics data,
 * animated counters, bar chart, donut chart, recent bookings,
 * top movies, and misc UI interactions.
 */

(function () {
    'use strict';

    // ── Dummy Data ──────────────────────────────────────────────────────────────

    const MONTHLY_REVENUE = [
        { month: 'OCT', amount: 32100 },
        { month: 'NOV', amount: 38400 },
        { month: 'DEC', amount: 51200 },
        { month: 'JAN', amount: 29800 },
        { month: 'FEB', amount: 43600 },
        { month: 'MAR', amount: 39900 },
        { month: 'APR', amount: 48320, current: true },
    ];

    const RECENT_BOOKINGS = [
        { id: '#BK-00842', customer: 'Yassine K.',    movie: 'Dune: Part Three',   seats: 3, amount: '$38.50', status: 'confirmed' },
        { id: '#BK-00841', customer: 'Sarah M.',       movie: 'Avengers: Doomsday', seats: 2, amount: '$27.00', status: 'confirmed' },
        { id: '#BK-00840', customer: 'Omar F.',        movie: 'The Dark Knight II', seats: 4, amount: '$52.00', status: 'pending'   },
        { id: '#BK-00839', customer: 'Lina B.',        movie: 'Interstellar 2',     seats: 1, amount: '$13.50', status: 'confirmed' },
        { id: '#BK-00838', customer: 'Hamza R.',       movie: 'Dune: Part Three',   seats: 2, amount: '$25.00', status: 'cancelled' },
        { id: '#BK-00837', customer: 'Nour A.',        movie: 'Black Panther III',  seats: 3, amount: '$40.50', status: 'confirmed' },
        { id: '#BK-00836', customer: 'Khaled S.',      movie: 'Avengers: Doomsday', seats: 2, amount: '$27.00', status: 'pending'   },
    ];

    const TOP_MOVIES = [
        { rank: 1, title: 'Avengers: Doomsday',  bookings: 342, pct: 100 },
        { rank: 2, title: 'Dune: Part Three',     bookings: 287, pct: 84  },
        { rank: 3, title: 'Black Panther III',    bookings: 214, pct: 63  },
        { rank: 4, title: 'The Dark Knight II',   bookings: 198, pct: 58  },
        { rank: 5, title: 'Interstellar 2',       bookings: 143, pct: 42  },
    ];

    const SPARKLINE_DATA = {
        revenue:  [40, 55, 70, 50, 65, 80, 95],
        bookings: [60, 50, 75, 65, 80, 70, 90],
        users:    [50, 65, 55, 70, 60, 85, 75],
        shows:    [80, 70, 60, 75, 65, 55, 70],
    };

    const OCCUPANCY_PCT = 73;

    // ── Init ────────────────────────────────────────────────────────────────────

    function init() {
        setTodayDate();
        buildSparklines();
        animateCounters();
        buildBarChart();
        animateDonut();
        populateRecentBookings();
        populateTopMovies();
        initRefreshBtn();
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

        const max = Math.max(...MONTHLY_REVENUE.map(d => d.amount));

        MONTHLY_REVENUE.forEach(item => {
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

        RECENT_BOOKINGS.forEach(booking => {
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

        TOP_MOVIES.forEach(movie => {
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

        btn.addEventListener('click', () => {
            btn.classList.add('spinning');
            setTimeout(() => btn.classList.remove('spinning'), 900);
        });
    }

    // ── Run ─────────────────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
