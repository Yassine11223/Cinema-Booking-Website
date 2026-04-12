/**
 * ============================================
 * CINEMA BOOKING — REFINED
 * Two-view flow: Selection → Seat Map
 * Per-experience hall layouts (IMAX > Dolby > Standard > Deluxe)
 * 10-minute reservation timer
 * sessionStorage persistence
 * ============================================
 */
(function () {
    'use strict';

    // ============================================
    // CONFIG
    // ============================================
    const CFG = {
        TIMER_DURATION: 600,
        TIMER_WARN: 120,
        TIMER_DANGER: 60,
        TOAST_MS: 4000,
        STORAGE_KEY: 'cinema_bk_v3',
        CURRENCY: 'EGP',
    };

    // ============================================
    // MOCK DATA
    // ============================================
    const MOVIE = {
        title: 'Dune: Part Three',
        genre: 'Sci-Fi • Adventure',
        rating: 'PG-13',
        duration: '2h 46m',
    };

    const PRICING = {
        IMAX: 320,
        Dolby: 280,
        Standard: 180,
        Deluxe: 250,
    };

    // ============================================
    // HALL LAYOUTS — different for each experience
    // IMAX = biggest, Dolby = slightly smaller,
    // Standard ≈ 20% smaller, Deluxe = smallest
    // ============================================
    function rng(a, b) {
        const arr = [];
        for (let i = a; i <= b; i++) arr.push(i);
        return arr;
    }

    const HALL_LAYOUTS = {
        // ── IMAX — 14 rows, widest, ~310 seats ──
        IMAX: {
            upper: [
                { row: 'A', sections: [rng(1, 7), rng(8, 18), rng(19, 25)] },
                { row: 'B', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'C', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'D', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'E', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'F', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'G', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'H', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'J', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
                { row: 'K', sections: [rng(1, 8), rng(9, 19), rng(20, 27)] },
            ],
            lower: [
                { row: 'L', sections: [rng(1, 6), rng(7, 17), rng(18, 23)] },
                { row: 'M', sections: [rng(1, 6), rng(7, 17), rng(18, 23)] },
                { row: 'N', sections: [rng(1, 5), rng(6, 14), rng(15, 19)] },
                { row: 'P', sections: [rng(1, 4), rng(5, 11), rng(12, 15)] },
            ],
        },

        // ── Dolby — 12 rows, slightly smaller, ~256 seats ──
        Dolby: {
            upper: [
                { row: 'A', sections: [rng(1, 6), rng(7, 16), rng(17, 22)] },
                { row: 'B', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'C', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'D', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'E', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'F', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'G', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'H', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
                { row: 'J', sections: [rng(1, 7), rng(8, 17), rng(18, 24)] },
            ],
            lower: [
                { row: 'K', sections: [rng(1, 5), rng(6, 14), rng(15, 19)] },
                { row: 'L', sections: [rng(1, 5), rng(6, 14), rng(15, 19)] },
                { row: 'M', sections: [rng(1, 4), rng(5, 12), rng(13, 16)] },
            ],
        },

        // ── Standard — 11 rows, ~200 seats (≈20% smaller than IMAX) ──
        Standard: {
            upper: [
                { row: 'A', sections: [rng(1, 5), rng(6, 13), rng(14, 18)] },
                { row: 'B', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
                { row: 'C', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
                { row: 'D', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
                { row: 'E', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
                { row: 'F', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
                { row: 'G', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
                { row: 'H', sections: [rng(1, 6), rng(7, 15), rng(16, 21)] },
            ],
            lower: [
                { row: 'J', sections: [rng(1, 4), rng(5, 12), rng(13, 16)] },
                { row: 'K', sections: [rng(1, 4), rng(5, 12), rng(13, 16)] },
                { row: 'L', sections: [rng(1, 3), rng(4, 10), rng(11, 13)] },
            ],
        },

        // ── Deluxe — 8 rows, compact premium, ~116 seats ──
        Deluxe: {
            upper: [
                { row: 'A', sections: [rng(1, 4), rng(5, 10), rng(11, 14)] },
                { row: 'B', sections: [rng(1, 5), rng(6, 12), rng(13, 17)] },
                { row: 'C', sections: [rng(1, 5), rng(6, 12), rng(13, 17)] },
                { row: 'D', sections: [rng(1, 5), rng(6, 12), rng(13, 17)] },
                { row: 'E', sections: [rng(1, 5), rng(6, 12), rng(13, 17)] },
                { row: 'F', sections: [rng(1, 5), rng(6, 12), rng(13, 17)] },
            ],
            lower: [
                { row: 'G', sections: [rng(1, 3), rng(4, 10), rng(11, 13)] },
                { row: 'H', sections: [rng(1, 3), rng(4, 10), rng(11, 13)] },
            ],
        },
    };

    // ============================================
    // UTILITIES
    // ============================================
    function hash(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; }
        return Math.abs(h);
    }

    function getLayout(expType) {
        return HALL_LAYOUTS[expType] || HALL_LAYOUTS.Standard;
    }

    function getAllRows(expType) {
        const lay = getLayout(expType);
        return [...lay.upper, ...lay.lower];
    }

    function getAllSeatIds(expType) {
        const ids = [];
        getAllRows(expType).forEach(r => r.sections.forEach(sec => sec.forEach(n => ids.push(`${r.row}${n}`))));
        return ids;
    }

    // ============================================
    // DATE / SHOWTIME GENERATION
    // ============================================
    function genDates() {
        const out = [];
        const dn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const mn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        for (let i = 0; i < 7; i++) {
            const d = new Date(); d.setDate(d.getDate() + i);
            out.push({
                key: d.toISOString().split('T')[0],
                dayName: i === 0 ? 'TODAY' : dn[d.getDay()],
                dayNum: d.getDate(),
                month: mn[d.getMonth()],
                full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
                iso: d,
            });
        }
        return out;
    }

    function genShowtimes(dateKey) {
        const h = hash(dateKey);
        return {
            IMAX: [
                { id: `imx1-${dateKey}`, time: '12:00', hall: 'IMAX Theatre', sold: false },
                { id: `imx2-${dateKey}`, time: '15:30', hall: 'IMAX Theatre', sold: false },
                { id: `imx3-${dateKey}`, time: '19:00', hall: 'IMAX Theatre', sold: (h % 4 === 0) },
                { id: `imx4-${dateKey}`, time: '22:15', hall: 'IMAX Theatre', sold: false },
            ],
            Dolby: [
                { id: `dlb1-${dateKey}`, time: '11:00', hall: 'Dolby Atmos', sold: false },
                { id: `dlb2-${dateKey}`, time: '14:00', hall: 'Dolby Atmos', sold: (h % 5 === 0) },
                { id: `dlb3-${dateKey}`, time: '17:30', hall: 'Dolby Atmos', sold: false },
                { id: `dlb4-${dateKey}`, time: '21:00', hall: 'Dolby Atmos', sold: false },
            ],
            Standard: [
                { id: `std1-${dateKey}`, time: '11:30', hall: 'Hall 1', sold: false },
                { id: `std2-${dateKey}`, time: '14:15', hall: 'Hall 1', sold: false },
                { id: `std3-${dateKey}`, time: '17:00', hall: 'Hall 3', sold: (h % 7 === 0) },
                { id: `std4-${dateKey}`, time: '20:30', hall: 'Hall 1', sold: false },
                { id: `std5-${dateKey}`, time: '23:00', hall: 'Hall 3', sold: false },
            ],
            Deluxe: [
                { id: `dlx1-${dateKey}`, time: '13:00', hall: 'Deluxe Suite', sold: false },
                { id: `dlx2-${dateKey}`, time: '16:30', hall: 'Deluxe Suite', sold: (h % 6 === 0) },
                { id: `dlx3-${dateKey}`, time: '19:45', hall: 'Deluxe Suite', sold: false },
            ],
        };
    }

    /**
     * Deterministically generate booked + held seats for a showtime.
     */
    function genSeatStates(showtimeId, expType) {
        const all = getAllSeatIds(expType);
        const h = hash(showtimeId);
        const booked = new Set();
        const held = new Set();

        const numBooked = Math.floor(all.length * (0.32 + (h % 12) * 0.012));
        for (let i = 0; i < numBooked; i++) {
            booked.add(all[Math.abs((h * (i + 7)) % all.length)]);
        }

        const numHeld = 3 + (h % 5);
        for (let i = 0; i < numHeld; i++) {
            const seat = all[Math.abs((h * (i + 41) + 19) % all.length)];
            if (!booked.has(seat)) held.add(seat);
        }

        return { booked: [...booked], held: [...held] };
    }

    // ============================================
    // STATE
    // ============================================
    const S = {
        dates: genDates(),
        dateKey: null,
        showtimes: null,
        stId: null,
        stType: null,
        seatStates: null,
        selected: [],
        timerStart: null,
        timerIv: null,
        confirmed: false,
        view: 'selection',

        get price() { return this.stType ? (PRICING[this.stType] || 0) : 0; },
        get total() { return this.selected.length * this.price; },
        get remain() {
            if (!this.timerStart) return CFG.TIMER_DURATION;
            return Math.max(0, CFG.TIMER_DURATION - Math.floor((Date.now() - this.timerStart) / 1000));
        },
        get showtime() {
            if (!this.showtimes || !this.stId) return null;
            for (const t of Object.keys(this.showtimes)) {
                const f = this.showtimes[t].find(x => x.id === this.stId);
                if (f) return { ...f, exp: t };
            }
            return null;
        },
    };

    // ============================================
    // PERSISTENCE
    // ============================================
    function save() {
        try {
            sessionStorage.setItem(CFG.STORAGE_KEY, JSON.stringify({
                dateKey: S.dateKey, stId: S.stId, stType: S.stType,
                selected: S.selected, timerStart: S.timerStart,
                confirmed: S.confirmed, view: S.view,
            }));
        } catch (_) { }
    }

    function load() {
        try {
            const d = JSON.parse(sessionStorage.getItem(CFG.STORAGE_KEY));
            if (!d) return false;
            const valid = S.dates.map(x => x.key);
            if (!valid.includes(d.dateKey)) { sessionStorage.removeItem(CFG.STORAGE_KEY); return false; }
            if (d.timerStart && !d.confirmed) {
                if (Math.floor((Date.now() - d.timerStart) / 1000) >= CFG.TIMER_DURATION) {
                    sessionStorage.removeItem(CFG.STORAGE_KEY);
                    return false;
                }
            }
            S.dateKey = d.dateKey;
            S.stId = d.stId;
            S.stType = d.stType;
            S.selected = d.selected || [];
            S.timerStart = d.timerStart;
            S.confirmed = d.confirmed || false;
            S.view = d.view || 'selection';
            if (S.dateKey) S.showtimes = genShowtimes(S.dateKey);
            if (S.stId && S.stType) S.seatStates = genSeatStates(S.stId, S.stType);
            return true;
        } catch (_) { return false; }
    }

    // ============================================
    // DOM CACHE
    // ============================================
    const D = {};
    function cacheDom() {
        D.viewSel = document.getElementById('view-selection');
        D.viewSeat = document.getElementById('view-seatmap');
        D.movieHeader = document.getElementById('movie-header');
        D.dateSel = document.getElementById('date-selector');
        D.timeSel = document.getElementById('showtime-selector');
        D.legend = document.getElementById('seat-legend');
        D.seatMap = document.getElementById('seat-map');
        D.timerDisp = document.getElementById('timer-display');
        D.bottomBar = document.getElementById('bottom-bar');
        D.modalOvl = document.getElementById('modal-overlay');
        D.modalBox = document.getElementById('modal-box');
        D.toasts = document.getElementById('toast-container');
        D.changeBtn = document.getElementById('change-btn');
    }

    // ============================================
    // VIEW MANAGEMENT
    // ============================================
    function showView(name) {
        S.view = name;
        D.viewSel.classList.toggle('active', name === 'selection');
        D.viewSeat.classList.toggle('active', name === 'seatmap');
        D.bottomBar.classList.toggle('visible', name === 'seatmap');
        save();
    }

    // ============================================
    // RENDER — Movie header
    // ============================================
    function renderMovieHeader() {
        D.movieHeader.innerHTML = `
            <h1 class="selection-movie__title">${MOVIE.title}</h1>
            <div class="selection-movie__meta">
                <span class="selection-movie__badge"><i class="fas fa-star"></i> ${MOVIE.rating}</span>
                <span class="selection-movie__badge"><i class="far fa-clock"></i> ${MOVIE.duration}</span>
                <span class="selection-movie__badge"><i class="fas fa-tags"></i> ${MOVIE.genre}</span>
            </div>
        `;
    }

    // ============================================
    // RENDER — Date selector
    // ============================================
    function renderDates() {
        D.dateSel.innerHTML = `<div class="date-selector">${S.dates.map(d => `
                <button class="date-card ${d.key === S.dateKey ? 'date-card--selected' : ''}"
                        data-key="${d.key}">
                    <span class="date-card__day">${d.dayName}</span>
                    <span class="date-card__num">${d.dayNum}</span>
                    <span class="date-card__month">${d.month}</span>
                </button>
            `).join('')
            }</div>`;
    }

    // ============================================
    // RENDER — Showtime selector
    // ============================================
    function renderShowtimes() {
        if (!S.dateKey) {
            D.timeSel.innerHTML = `<div class="showtime-placeholder">
                <i class="far fa-calendar-alt"></i>Please select a date first</div>`;
            return;
        }
        const st = S.showtimes;
        const order = ['IMAX', 'Dolby', 'Standard', 'Deluxe'];
        let html = '<div class="showtime-groups">';
        order.forEach(type => {
            const times = st[type];
            if (!times || !times.length) return;
            html += `<div>
                <div class="showtime-group__label showtime-group__label--${type.toLowerCase()}">${type}</div>
                <div class="showtime-chips">
                    ${times.map(t => `
                        <button class="showtime-chip ${t.id === S.stId ? 'showtime-chip--selected' : ''} ${t.sold ? 'showtime-chip--disabled' : ''}"
                                data-id="${t.id}" data-exp="${type}" ${t.sold ? 'disabled' : ''}>
                            <span class="showtime-chip__time">${t.time}</span>
                            <span class="showtime-chip__hall">${t.hall}</span>
                            ${t.sold ? '<span class="showtime-chip__sold">Sold Out</span>' : ''}
                        </button>
                    `).join('')}
                </div>
            </div>`;
        });
        html += '</div>';
        D.timeSel.innerHTML = html;
    }

    // ============================================
    // RENDER — Seat legend
    // ============================================
    function renderLegend() {
        const exp = S.stType || 'Standard';
        D.legend.innerHTML = `
            <div class="legend-item"><span class="legend-dot legend-dot--available"></span><span class="legend-label">${exp}</span></div>
            <div class="legend-item"><span class="legend-dot legend-dot--premium"></span><span class="legend-label">${exp} Premium</span></div>
            <div class="legend-item"><span class="legend-dot legend-dot--occupied"></span><span class="legend-label">Occupied</span></div>
            <div class="legend-item"><span class="legend-dot legend-dot--selected"></span><span class="legend-label">Selected</span></div>
            <div class="legend-item"><span class="legend-dot legend-dot--held"></span><span class="legend-label">Held</span></div>
        `;
    }

    // ============================================
    // RENDER — Seat map (per-experience layout)
    // ============================================
    function renderSeatMap() {
        if (!S.seatStates || !S.stType) { D.seatMap.innerHTML = ''; return; }

        const layout = getLayout(S.stType);
        const booked = new Set(S.seatStates.booked);
        const held = new Set(S.seatStates.held);
        const sel = new Set(S.selected);

        let html = '';

        // Upper section
        layout.upper.forEach(rowDef => {
            html += buildRow(rowDef, 'standard', booked, held, sel);
        });

        // Section gap
        html += '<div class="section-gap"></div>';

        // Lower section (premium)
        layout.lower.forEach(rowDef => {
            html += buildRow(rowDef, 'premium', booked, held, sel);
        });

        D.seatMap.innerHTML = html;
    }

    function buildRow(rowDef, seatType, booked, held, sel) {
        let seats = '';
        let prev = false;
        rowDef.sections.forEach(sec => {
            if (sec.length === 0) return;
            if (prev) seats += '<div class="seat-aisle"></div>';
            sec.forEach(n => {
                const id = `${rowDef.row}${n}`;
                let cls = 'seat';
                let dis = false;

                if (booked.has(id)) {
                    cls += ' seat--occupied'; dis = true;
                } else if (held.has(id)) {
                    cls += ' seat--held'; dis = true;
                } else if (sel.has(id)) {
                    cls += ' seat--selected';
                    if (seatType === 'premium') cls += ' seat--premium-available';
                } else {
                    cls += seatType === 'premium' ? ' seat--premium-available' : ' seat--available';
                }

                seats += `<button class="${cls}" data-id="${id}" ${dis ? 'disabled' : ''}></button>`;
            });
            prev = true;
        });

        return `<div class="seat-row">
            <span class="row-label">${rowDef.row}</span>
            <div class="row-seats">${seats}</div>
            <span class="row-label">${rowDef.row}</span>
        </div>`;
    }

    // ============================================
    // RENDER — Timer
    // ============================================
    function renderTimer() {
        if (!S.timerStart || S.confirmed) {
            D.timerDisp.innerHTML = '<span class="timer-badge timer-badge--hidden"><i class="far fa-clock"></i> --:--</span>';
            return;
        }
        const r = S.remain;
        const m = Math.floor(r / 60);
        const s = r % 60;
        const state = r <= CFG.TIMER_DANGER ? 'danger' : r <= CFG.TIMER_WARN ? 'warning' : 'safe';
        D.timerDisp.innerHTML = `<span class="timer-badge timer-badge--${state}">
            <i class="far fa-clock"></i> ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}
        </span>`;
    }

    // ============================================
    // RENDER — Bottom bar (refined)
    // ============================================
    function renderBottomBar() {
        const st = S.showtime;
        const date = S.dates.find(d => d.key === S.dateKey);
        const hasSeats = S.selected.length > 0;
        const seatCount = S.selected.length;

        // Left
        let leftHtml = '';
        if (st && date) {
            const dayStr = date.iso.toLocaleDateString('en-US', { weekday: 'long' });
            leftHtml = `
                <span class="bar-left__line1">${dayStr}, ${st.time}</span>
                <span class="bar-left__line2">${date.full}</span>
                <span class="bar-left__line3">${st.hall} · ${st.exp}</span>
            `;
        }

        // Center
        let centerHtml = '';
        if (!hasSeats) {
            centerHtml = `<span class="bar-center__status">Please Choose Seats!</span>`;
        } else {
            const tags = S.selected.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                .map(s => `<span class="bar-seat-tag">${s}</span>`).join('');
            centerHtml = `<div class="bar-seats-list">${tags}</div>`;
        }
        centerHtml += `<div class="bar-center__movie">${MOVIE.title}</div>`;

        // Right
        const canCheckout = hasSeats && !S.confirmed;
        const btnLabel = S.confirmed
            ? '<i class="fas fa-check-circle"></i> Confirmed'
            : `<i class="fas fa-arrow-right"></i> Checkout${seatCount ? ` (${seatCount})` : ''}`;

        D.bottomBar.innerHTML = `
            <div class="bar-left">${leftHtml}</div>
            <div class="bar-center">${centerHtml}</div>
            <div class="bar-right">
                <button class="btn-checkout" id="btn-checkout" ${!canCheckout ? 'disabled' : ''}>${btnLabel}</button>
                <span class="bar-right__price">${S.total.toLocaleString()} ${CFG.CURRENCY}</span>
            </div>
        `;
    }

    // ============================================
    // TIMER LOGIC
    // ============================================
    function startTimer() {
        if (S.timerIv) return;
        if (!S.timerStart) S.timerStart = Date.now();
        save();
        renderTimer();

        S.timerIv = setInterval(() => {
            const r = S.remain;
            if (r <= 0) { expireTimer(); return; }
            if (r === CFG.TIMER_WARN) toast('Less than 2 minutes to confirm!', 'warning');
            renderTimer();
        }, 1000);
    }

    function stopTimer() {
        if (S.timerIv) { clearInterval(S.timerIv); S.timerIv = null; }
    }

    function expireTimer() {
        stopTimer();
        S.selected = [];
        S.timerStart = null;
        S.confirmed = false;
        save();
        renderSeatMap();
        renderTimer();
        renderBottomBar();
        showExpiredModal();
    }

    // ============================================
    // MODALS
    // ============================================
    function showExpiredModal() {
        D.modalBox.innerHTML = `
            <div class="modal-icon modal-icon--expired"><i class="fas fa-hourglass-end"></i></div>
            <h3 class="modal-title">Reservation Expired</h3>
            <p class="modal-text">Your 10-minute reservation has expired and your selected seats have been released. Please select your seats again.</p>
            <button class="modal-btn modal-btn--red" id="modal-close">Select Again</button>
        `;
        D.modalOvl.classList.add('active');
    }

    function showSuccessModal() {
        D.modalBox.innerHTML = `
            <div class="modal-icon modal-icon--success"><i class="fas fa-check"></i></div>
            <h3 class="modal-title">Booking Confirmed!</h3>
            <p class="modal-text">Your seats are locked and your booking is confirmed. You would now proceed to payment.</p>
            <button class="modal-btn modal-btn--green" id="modal-close">Continue</button>
        `;
        D.modalOvl.classList.add('active');
    }

    function hideModal() { D.modalOvl.classList.remove('active'); }

    // ============================================
    // TOAST
    // ============================================
    const ICONS = { info: 'fas fa-info-circle', warning: 'fas fa-exclamation-triangle', error: 'fas fa-times-circle', success: 'fas fa-check-circle' };

    function toast(msg, type = 'info') {
        const el = document.createElement('div');
        el.className = `booking-toast booking-toast--${type}`;
        el.innerHTML = `<i class="${ICONS[type]}"></i><span>${msg}</span><button class="booking-toast__close"><i class="fas fa-times"></i></button>`;
        D.toasts.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        el.querySelector('.booking-toast__close').onclick = () => killToast(el);
        setTimeout(() => killToast(el), CFG.TOAST_MS);
    }

    function killToast(el) {
        el.classList.remove('show');
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================
    function onDateClick(key) {
        if (key === S.dateKey) return;
        S.dateKey = key;
        S.stId = null; S.stType = null; S.seatStates = null;
        S.selected = []; S.timerStart = null; S.confirmed = false;
        stopTimer();
        S.showtimes = genShowtimes(key);
        save();
        renderDates();
        renderShowtimes();
    }

    function onShowtimeClick(id, exp) {
        if (id === S.stId) return;
        S.stId = id; S.stType = exp;
        S.selected = []; S.timerStart = null; S.confirmed = false;
        stopTimer();
        S.seatStates = genSeatStates(id, exp);
        save();

        // Transition to seat map view
        renderShowtimes();
        renderLegend();
        renderSeatMap();
        renderTimer();
        renderBottomBar();
        showView('seatmap');
    }

    function onSeatClick(id) {
        if (S.confirmed) { toast('Booking already confirmed.', 'info'); return; }

        const idx = S.selected.indexOf(id);
        if (idx > -1) {
            S.selected.splice(idx, 1);
            if (S.selected.length === 0) { S.timerStart = null; stopTimer(); }
        } else {
            S.selected.push(id);
            if (S.selected.length === 1 && !S.timerStart) {
                startTimer();
                toast('10-minute reservation started!', 'info');
            }
        }
        save();
        updateSeat(id);
        renderBottomBar();
        renderTimer();
    }

    /** Efficiently toggle one seat's visual state */
    function updateSeat(id) {
        const el = D.seatMap.querySelector(`[data-id="${id}"]`);
        if (!el) return;
        const isSel = S.selected.includes(id);
        el.classList.toggle('seat--selected', isSel);
    }

    function onCheckout() {
        if (!S.stId) { toast('Select a showtime first.', 'warning'); return; }
        if (S.selected.length === 0) { toast('Select at least one seat.', 'warning'); return; }
        S.confirmed = true;
        stopTimer();
        save();
        renderBottomBar();
        renderTimer();
        showSuccessModal();
        toast('Booking confirmed!', 'success');
    }

    function onChangeDateTime() {
        showView('selection');
        renderDates();
        renderShowtimes();
    }

    // ============================================
    // EVENT BINDING (delegation)
    // ============================================
    function bind() {
        D.dateSel.addEventListener('click', e => {
            const c = e.target.closest('.date-card');
            if (c) onDateClick(c.dataset.key);
        });

        D.timeSel.addEventListener('click', e => {
            const c = e.target.closest('.showtime-chip');
            if (c && !c.disabled) onShowtimeClick(c.dataset.id, c.dataset.exp);
        });

        D.seatMap.addEventListener('click', e => {
            const s = e.target.closest('.seat');
            if (s && !s.disabled) onSeatClick(s.dataset.id);
        });

        D.bottomBar.addEventListener('click', e => {
            if (e.target.closest('#btn-checkout') && !e.target.closest('#btn-checkout').disabled) onCheckout();
        });

        D.changeBtn.addEventListener('click', onChangeDateTime);

        D.modalOvl.addEventListener('click', e => {
            if (e.target === D.modalOvl || e.target.closest('#modal-close')) {
                hideModal();
                if (!S.confirmed) { renderSeatMap(); renderBottomBar(); }
            }
        });
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        cacheDom();
        bind();

        const restored = load();
        if (!restored) {
            S.dateKey = S.dates[0].key;
            S.showtimes = genShowtimes(S.dateKey);
            S.view = 'selection';
        }

        renderMovieHeader();
        renderDates();
        renderShowtimes();

        if (S.view === 'seatmap' && S.stId && S.stType) {
            renderLegend();
            renderSeatMap();
            renderTimer();
            renderBottomBar();
            showView('seatmap');
            if (S.timerStart && !S.confirmed && S.selected.length > 0) startTimer();
        } else {
            showView('selection');
        }
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
