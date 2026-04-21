/* ============================================
   BOOKING MANAGEMENT — Admin Logic
   Full booking list CRUD, filtering, pagination,
   detail drawer, actions, and toast notifications
   ============================================ */

(function () {
    'use strict';

    /* =======================================
       SAMPLE BOOKING DATA
       ======================================= */
    /* Theater-type pricing — matches frontend/js/booking.js PRICING */
    const PRICING = { imax: 320, dolby: 280, standard: 180, deluxe: 250 };

    /* Theater type metadata — matches admin Theater Management */
    const THEATER_TYPE_MAP = {
        imax:     { label: 'IMAX',     icon: 'fa-expand',      cls: 'imax' },
        dolby:    { label: 'Dolby',    icon: 'fa-volume-high', cls: 'dolby' },
        standard: { label: 'Standard', icon: 'fa-tv',          cls: 'standard' },
        deluxe:   { label: 'Deluxe',   icon: 'fa-gem',         cls: 'deluxe' }
    };

    /* Payment method icon map */
    const PAY_METHOD_ICONS = {
        'Visa Card':     'fa-cc-visa',
        'MasterCard':    'fa-cc-mastercard',
        'Apple Pay':     'fa-apple-pay',
        'Fawry':         'fa-money-bill-wave',
        'Vodafone Cash': 'fa-mobile-screen-button'
    };

    const bookings = [
        {
            id: 'BK-1024',
            customerName: 'Ahmed Ali',
            email: 'ahmed.ali@email.com',
            phone: '0101-234-5678',
            movie: 'Interstellar',
            theater: 'IMAX Hall 1',
            theaterType: 'imax',
            branch: 'Nasr City',
            showtime: '2026-04-20T19:30',
            seats: ['C5', 'C6'],
            tickets: 2,
            totalAmount: 640,
            pricePerTicket: 320,
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            paymentMethod: 'Visa Card',
            transactionId: 'TX-987654',
            createdAt: '2026-04-18T14:23:00',
            notes: ''
        },
        {
            id: 'BK-1025',
            customerName: 'Sara Mohamed',
            email: 'sara.m@email.com',
            phone: '0112-345-6789',
            movie: 'John Wick 4',
            theater: 'Dolby Hall 2',
            theaterType: 'dolby',
            branch: 'New Cairo',
            showtime: '2026-04-20T21:00',
            seats: ['F7'],
            tickets: 1,
            totalAmount: 280,
            pricePerTicket: 280,
            paymentStatus: 'paid',
            bookingStatus: 'checkedin',
            paymentMethod: 'MasterCard',
            transactionId: 'TX-987655',
            createdAt: '2026-04-19T09:10:00',
            notes: 'VIP customer'
        },
        {
            id: 'BK-1026',
            customerName: 'Omar Hassan',
            email: 'omar.h@email.com',
            phone: '0123-456-7890',
            movie: 'Dune Part Two',
            theater: 'Standard Hall 6',
            theaterType: 'standard',
            branch: 'New Cairo',
            showtime: '2026-04-21T18:00',
            seats: ['B3', 'B4', 'B5'],
            tickets: 3,
            totalAmount: 540,
            pricePerTicket: 180,
            paymentStatus: 'pending',
            bookingStatus: 'confirmed',
            paymentMethod: 'Fawry',
            transactionId: 'TX-987656',
            createdAt: '2026-04-19T16:45:00',
            notes: ''
        },
        {
            id: 'BK-1027',
            customerName: 'Mariam Ashraf',
            email: 'mariam.a@email.com',
            phone: '0100-987-6543',
            movie: 'Oppenheimer',
            theater: 'Deluxe Hall 4',
            theaterType: 'deluxe',
            branch: 'Sheikh Zayed',
            showtime: '2026-04-21T22:30',
            seats: ['A1', 'A2'],
            tickets: 2,
            totalAmount: 500,
            pricePerTicket: 250,
            paymentStatus: 'refunded',
            bookingStatus: 'cancelled',
            paymentMethod: 'Visa Card',
            transactionId: 'TX-987657',
            createdAt: '2026-04-17T11:30:00',
            notes: 'Customer requested cancellation'
        },
        {
            id: 'BK-1028',
            customerName: 'Youssef Tarek',
            email: 'youssef.t@email.com',
            phone: '0155-678-1234',
            movie: 'The Batman',
            theater: 'IMAX Hall 5',
            theaterType: 'imax',
            branch: 'Sheikh Zayed',
            showtime: '2026-04-22T17:00',
            seats: ['D10', 'D11', 'D12', 'D13'],
            tickets: 4,
            totalAmount: 1280,
            pricePerTicket: 320,
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            paymentMethod: 'Apple Pay',
            transactionId: 'TX-987658',
            createdAt: '2026-04-20T08:15:00',
            notes: ''
        },
        {
            id: 'BK-1029',
            customerName: 'Nour El-Din',
            email: 'nour.e@email.com',
            phone: '0109-876-5432',
            movie: 'Spider-Man: Beyond',
            theater: 'Dolby Hall 7',
            theaterType: 'dolby',
            branch: 'Nasr City',
            showtime: '2026-04-22T20:00',
            seats: ['E1', 'E2'],
            tickets: 2,
            totalAmount: 560,
            pricePerTicket: 280,
            paymentStatus: 'failed',
            bookingStatus: 'cancelled',
            paymentMethod: 'Visa Card',
            transactionId: 'TX-987659',
            createdAt: '2026-04-20T10:02:00',
            notes: 'Payment gateway error'
        },
        {
            id: 'BK-1030',
            customerName: 'Layla Ibrahim',
            email: 'layla.i@email.com',
            phone: '0122-111-2233',
            movie: 'Interstellar',
            theater: 'IMAX Hall 1',
            theaterType: 'imax',
            branch: 'Nasr City',
            showtime: '2026-04-20T19:30',
            seats: ['C8'],
            tickets: 1,
            totalAmount: 320,
            pricePerTicket: 320,
            paymentStatus: 'paid',
            bookingStatus: 'checkedin',
            paymentMethod: 'MasterCard',
            transactionId: 'TX-987660',
            createdAt: '2026-04-18T20:01:00',
            notes: ''
        },
        {
            id: 'BK-1031',
            customerName: 'Khaled Mansour',
            email: 'khaled.m@email.com',
            phone: '0100-222-3344',
            movie: 'Dune Part Two',
            theater: 'Standard Hall 6',
            theaterType: 'standard',
            branch: 'New Cairo',
            showtime: '2026-04-23T15:30',
            seats: ['G1', 'G2', 'G3'],
            tickets: 3,
            totalAmount: 540,
            pricePerTicket: 180,
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            paymentMethod: 'Fawry',
            transactionId: 'TX-987661',
            createdAt: '2026-04-20T12:30:00',
            notes: ''
        },
        {
            id: 'BK-1032',
            customerName: 'Hana Sayed',
            email: 'hana.s@email.com',
            phone: '0115-444-5566',
            movie: 'John Wick 4',
            theater: 'Dolby Hall 2',
            theaterType: 'dolby',
            branch: 'New Cairo',
            showtime: '2026-04-23T21:00',
            seats: ['H5', 'H6'],
            tickets: 2,
            totalAmount: 560,
            pricePerTicket: 280,
            paymentStatus: 'pending',
            bookingStatus: 'confirmed',
            paymentMethod: 'Vodafone Cash',
            transactionId: 'TX-987662',
            createdAt: '2026-04-21T07:45:00',
            notes: 'Awaiting payment confirmation'
        },
        {
            id: 'BK-1033',
            customerName: 'Ali Mostafa',
            email: 'ali.m@email.com',
            phone: '0128-999-0011',
            movie: 'Oppenheimer',
            theater: 'Deluxe Hall 4',
            theaterType: 'deluxe',
            branch: 'Sheikh Zayed',
            showtime: '2026-04-24T19:00',
            seats: ['A5'],
            tickets: 1,
            totalAmount: 250,
            pricePerTicket: 250,
            paymentStatus: 'paid',
            bookingStatus: 'expired',
            paymentMethod: 'Visa Card',
            transactionId: 'TX-987663',
            createdAt: '2026-04-15T09:00:00',
            notes: 'Showtime passed, customer did not attend'
        },
        {
            id: 'BK-1034',
            customerName: 'Fatma Adel',
            email: 'fatma.a@email.com',
            phone: '0106-777-8899',
            movie: 'The Batman',
            theater: 'IMAX Hall 1',
            theaterType: 'imax',
            branch: 'Nasr City',
            showtime: '2026-04-24T22:00',
            seats: ['D1', 'D2'],
            tickets: 2,
            totalAmount: 640,
            pricePerTicket: 320,
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            paymentMethod: 'MasterCard',
            transactionId: 'TX-987664',
            createdAt: '2026-04-21T11:20:00',
            notes: ''
        },
        {
            id: 'BK-1035',
            customerName: 'Mohamed Nabil',
            email: 'mohamed.n@email.com',
            phone: '0111-333-4455',
            movie: 'Spider-Man: Beyond',
            theater: 'Standard Hall 6',
            theaterType: 'standard',
            branch: 'New Cairo',
            showtime: '2026-04-25T16:00',
            seats: ['E8', 'E9', 'E10'],
            tickets: 3,
            totalAmount: 540,
            pricePerTicket: 180,
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            paymentMethod: 'Apple Pay',
            transactionId: 'TX-987665',
            createdAt: '2026-04-21T15:40:00',
            notes: ''
        }
    ];

    /* =======================================
       PAGINATION STATE
       ======================================= */
    const ITEMS_PER_PAGE = 8;
    let currentPage = 1;
    let filteredBookings = [...bookings];

    /* =======================================
       DOM REFERENCES
       ======================================= */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const tbody         = $('#bookings-tbody');
    const emptyState    = $('#empty-state');
    const tableSection  = $('#table-container');
    const filterCount   = $('#filter-count');

    // Stat elements
    const statTotal     = $('#stat-total');
    const statConfirmed = $('#stat-confirmed');
    const statCancelled = $('#stat-cancelled');
    const statRevenue   = $('#stat-revenue');
    const statPending   = $('#stat-pending');
    const statRefunded  = $('#stat-refunded');

    // Filter elements
    const searchInput     = $('#filter-search');
    const headerSearch    = $('#header-search');
    const filterMovie     = $('#filter-movie');
    const filterTheater   = $('#filter-theater');
    const filterPayment   = $('#filter-payment');
    const filterBooking   = $('#filter-booking');
    const filterDateFrom  = $('#filter-date-from');
    const filterDateTo    = $('#filter-date-to');
    const filterSort      = $('#filter-sort');
    const btnClearFilters = $('#btn-clear-filters');

    // Drawer elements
    const detailOverlay = $('#detail-overlay');
    const detailDrawer  = $('#detail-drawer');
    const detailBody    = $('#detail-body');
    const detailClose   = $('#detail-close-btn');

    // Confirm modal
    const confirmOverlay = $('#confirm-modal-overlay');

    // Toast container
    const toastContainer = $('#toast-container');

    /* =======================================
       UTILITY HELPERS
       ======================================= */
    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function formatDateTime(dateStr) {
        return formatDate(dateStr) + ' at ' + formatTime(dateStr);
    }

    function formatCurrency(amount) {
        return amount.toLocaleString() + ' EGP';
    }

    function theaterTypeBadge(type) {
        const t = THEATER_TYPE_MAP[type];
        if (!t) return '';
        return `<span class="type-badge type-badge--${t.cls}"><i class="fas ${t.icon}"></i> ${t.label}</span>`;
    }

    function payMethodIcon(method) {
        const icon = PAY_METHOD_ICONS[method];
        if (!icon) return '';
        return `<i class="fab ${icon}" style="font-size:16px;opacity:0.6;margin-right:4px;"></i>`;
    }

    /* =======================================
       COMPUTE STATS
       ======================================= */
    function updateStats() {
        const total     = bookings.length;
        const confirmed = bookings.filter(b => b.bookingStatus === 'confirmed').length;
        const checkedin = bookings.filter(b => b.bookingStatus === 'checkedin').length;
        const cancelled = bookings.filter(b => b.bookingStatus === 'cancelled').length;
        const revenue   = bookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalAmount, 0);
        const pending   = bookings.filter(b => b.paymentStatus === 'pending').length;
        const refunded  = bookings.filter(b => b.paymentStatus === 'refunded').length;

        animateValue(statTotal, total);
        animateValue(statConfirmed, confirmed + checkedin);
        animateValue(statCancelled, cancelled);
        animateValue(statRevenue, revenue, true);
        animateValue(statPending, pending);
        animateValue(statRefunded, refunded);
    }

    function animateValue(el, target, isCurrency = false) {
        const duration = 600;
        const start = parseInt(el.textContent.replace(/[^\d]/g, '')) || 0;
        const diff = target - start;
        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.round(start + diff * ease);
            el.textContent = isCurrency ? formatCurrency(current) : current.toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* =======================================
       FILTER + SORT LOGIC
       ======================================= */
    function applyFilters() {
        const search     = (searchInput.value || headerSearch.value || '').toLowerCase().trim();
        const movie      = filterMovie.value;
        const theater    = filterTheater.value;
        const payment    = filterPayment.value;
        const booking    = filterBooking.value;
        const dateFrom   = filterDateFrom.value;
        const dateTo     = filterDateTo.value;
        const sort       = filterSort.value;

        filteredBookings = bookings.filter(b => {
            // Search
            if (search && !b.id.toLowerCase().includes(search) &&
                !b.customerName.toLowerCase().includes(search) &&
                !b.email.toLowerCase().includes(search)) {
                return false;
            }
            // Movie
            if (movie && b.movie !== movie) return false;
            // Theater
            if (theater && b.theater !== theater) return false;
            // Payment status
            if (payment && b.paymentStatus !== payment) return false;
            // Booking status
            if (booking && b.bookingStatus !== booking) return false;
            // Date range
            if (dateFrom) {
                const bookDate = new Date(b.createdAt).toISOString().slice(0, 10);
                if (bookDate < dateFrom) return false;
            }
            if (dateTo) {
                const bookDate = new Date(b.createdAt).toISOString().slice(0, 10);
                if (bookDate > dateTo) return false;
            }
            return true;
        });

        // Sort
        switch (sort) {
            case 'newest':
                filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
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

        currentPage = 1;
        renderTable();
        updateFilterCount();
    }

    function updateFilterCount() {
        const spans = filterCount.querySelectorAll('span');
        spans[0].textContent = filteredBookings.length;
        spans[1].textContent = bookings.length;
    }

    function clearFilters() {
        searchInput.value = '';
        headerSearch.value = '';
        filterMovie.value = '';
        filterTheater.value = '';
        filterPayment.value = '';
        filterBooking.value = '';
        filterDateFrom.value = '';
        filterDateTo.value = '';
        filterSort.value = '';
        applyFilters();
    }

    /* =======================================
       BADGE RENDERERS
       ======================================= */
    function paymentBadge(status) {
        const map = {
            paid:     { label: 'Paid',     cls: 'paid' },
            pending:  { label: 'Pending',  cls: 'pending' },
            failed:   { label: 'Failed',   cls: 'failed' },
            refunded: { label: 'Refunded', cls: 'refunded' }
        };
        const { label, cls } = map[status] || map.pending;
        return `<span class="payment-badge payment-badge--${cls}"><span class="dot"></span>${label}</span>`;
    }

    function bookingBadge(status) {
        const map = {
            confirmed: { label: 'Confirmed',  cls: 'confirmed' },
            cancelled: { label: 'Cancelled',  cls: 'cancelled' },
            checkedin: { label: 'Checked In', cls: 'checkedin' },
            expired:   { label: 'Expired',    cls: 'expired' }
        };
        const { label, cls } = map[status] || map.confirmed;
        return `<span class="booking-badge booking-badge--${cls}"><span class="dot"></span>${label}</span>`;
    }

    /* =======================================
       TABLE RENDERING
       ======================================= */
    function renderTable() {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = filteredBookings.slice(start, start + ITEMS_PER_PAGE);

        if (filteredBookings.length === 0) {
            tableSection.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        tableSection.style.display = '';
        emptyState.style.display = 'none';

        tbody.innerHTML = pageData.map((b, i) => `
            <tr data-id="${b.id}" style="animation: fadeIn 0.3s ease ${i * 0.04}s both;">
                <td class="booking-id-cell">${b.id}</td>
                <td>
                    <div class="customer-cell">
                        <div class="customer-avatar">${getInitials(b.customerName)}</div>
                        <span class="customer-name">${b.customerName}</span>
                    </div>
                </td>
                <td class="movie-cell">${b.movie}</td>
                <td>${b.theater}</td>
                <td>
                    <div class="showtime-cell">
                        <span class="showtime-date">${formatDate(b.showtime)}</span>
                        <span class="showtime-time">${formatTime(b.showtime)}</span>
                    </div>
                </td>
                <td>
                    <div class="seats-cell">
                        ${b.seats.map(s => `<span class="seat-tag">${s}</span>`).join('')}
                    </div>
                </td>
                <td>${b.tickets} ${b.tickets === 1 ? 'ticket' : 'tickets'}</td>
                <td class="amount-cell">${formatCurrency(b.totalAmount)}</td>
                <td>${paymentBadge(b.paymentStatus)}</td>
                <td>${bookingBadge(b.bookingStatus)}</td>
                <td>${formatDate(b.createdAt)}</td>
                <td>
                    <div class="row-actions">
                        <button class="action-trigger" data-id="${b.id}" aria-label="Actions" id="action-btn-${b.id}">
                            <i class="fas fa-ellipsis-vertical"></i>
                        </button>
                        <div class="action-dropdown" id="dropdown-${b.id}">
                            <button class="action-dropdown-item action-dropdown-item--view" data-action="view" data-id="${b.id}">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            ${b.bookingStatus !== 'checkedin' && b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'expired' ? `
                            <button class="action-dropdown-item action-dropdown-item--checkin" data-action="checkin" data-id="${b.id}">
                                <i class="fas fa-check-circle"></i> Mark as Checked In
                            </button>` : ''}
                            ${b.bookingStatus !== 'cancelled' ? `
                            <button class="action-dropdown-item action-dropdown-item--cancel" data-action="cancel" data-id="${b.id}">
                                <i class="fas fa-ban"></i> Cancel Booking
                            </button>` : ''}
                            <div class="action-dropdown-divider"></div>
                            ${b.paymentStatus === 'paid' && b.paymentStatus !== 'refunded' ? `
                            <button class="action-dropdown-item action-dropdown-item--refund" data-action="refund" data-id="${b.id}">
                                <i class="fas fa-rotate-left"></i> Refund Booking
                            </button>` : ''}
                            <button class="action-dropdown-item action-dropdown-item--resend" data-action="resend" data-id="${b.id}">
                                <i class="fas fa-paper-plane"></i> Resend Confirmation
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        renderPagination();
        bindRowEvents();
    }

    /* =======================================
       PAGINATION
       ======================================= */
    function renderPagination() {
        const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
        const footer = document.querySelector('.table-footer');
        if (!footer) return;

        const pageInfo = footer.querySelector('.page-info');
        const pagination = footer.querySelector('.pagination');

        const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length);
        pageInfo.innerHTML = `Showing <span>${start}</span> to <span>${end}</span> of <span>${filteredBookings.length}</span> bookings`;

        let btns = '';
        btns += `<button class="page-btn page-btn--nav" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 7) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    btns += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    btns += `<button class="page-btn" disabled>…</button>`;
                }
            } else {
                btns += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
        }

        btns += `<button class="page-btn page-btn--nav" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;

        pagination.innerHTML = btns;

        // Bind pagination
        pagination.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    renderTable();
                    // Scroll to table top
                    tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    /* =======================================
       ROW EVENT BINDINGS
       ======================================= */
    let activeDropdown = null;

    function bindRowEvents() {
        // Action trigger buttons
        tbody.querySelectorAll('.action-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const dropdown = document.getElementById(`dropdown-${id}`);
                closeAllDropdowns();
                if (dropdown) {
                    dropdown.classList.add('active');
                    activeDropdown = dropdown;
                }
            });
        });

        // Action dropdown items
        tbody.querySelectorAll('.action-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const id = item.dataset.id;
                closeAllDropdowns();
                handleAction(action, id);
            });
        });

        // Row click → view details
        tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.row-actions')) return;
                const id = row.dataset.id;
                openDrawer(id);
            });
        });
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.action-dropdown.active').forEach(d => d.classList.remove('active'));
        activeDropdown = null;
    }

    // Close dropdown on outside click
    document.addEventListener('click', () => {
        closeAllDropdowns();
    });

    /* =======================================
       ACTION HANDLERS
       ======================================= */
    function handleAction(action, id) {
        switch (action) {
            case 'view':
                openDrawer(id);
                break;
            case 'checkin':
                showConfirmModal('checkin', id);
                break;
            case 'cancel':
                showConfirmModal('cancel', id);
                break;
            case 'refund':
                showConfirmModal('refund', id);
                break;
            case 'resend':
                showToast('success', `Confirmation email resent for ${id}`);
                break;
        }
    }

    /* =======================================
       CONFIRM MODAL
       ======================================= */
    function showConfirmModal(type, bookingId) {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const config = {
            cancel: {
                icon: 'fa-ban',
                iconClass: 'cancel',
                title: 'Cancel Booking',
                message: `Are you sure you want to cancel booking <strong>${bookingId}</strong> for <strong>${booking.customerName}</strong>? This action cannot be undone.`,
                btnClass: 'cancel',
                btnLabel: 'Cancel Booking'
            },
            checkin: {
                icon: 'fa-check-circle',
                iconClass: 'checkin',
                title: 'Check In',
                message: `Mark booking <strong>${bookingId}</strong> for <strong>${booking.customerName}</strong> as checked in?`,
                btnClass: 'checkin',
                btnLabel: 'Confirm Check In'
            },
            refund: {
                icon: 'fa-rotate-left',
                iconClass: 'refund',
                title: 'Refund Booking',
                message: `Process a refund of <strong>${formatCurrency(booking.totalAmount)}</strong> for booking <strong>${bookingId}</strong>? This will credit the customer's ${booking.paymentMethod}.`,
                btnClass: 'refund',
                btnLabel: 'Process Refund'
            }
        };

        const c = config[type];

        confirmOverlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-modal-icon confirm-modal-icon--${c.iconClass}">
                    <i class="fas ${c.icon}"></i>
                </div>
                <h3>${c.title}</h3>
                <p>${c.message}</p>
                <div class="confirm-modal-actions">
                    <button class="btn-cancel" id="confirm-cancel-btn">Dismiss</button>
                    <button class="btn-confirm btn-confirm--${c.btnClass}" id="confirm-action-btn">${c.btnLabel}</button>
                </div>
            </div>
        `;

        confirmOverlay.classList.add('active');

        // Dismiss
        document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirmModal);
        confirmOverlay.addEventListener('click', (e) => {
            if (e.target === confirmOverlay) closeConfirmModal();
        });

        // Confirm
        document.getElementById('confirm-action-btn').addEventListener('click', () => {
            performAction(type, bookingId);
            closeConfirmModal();
        });
    }

    function closeConfirmModal() {
        confirmOverlay.classList.remove('active');
    }

    function performAction(type, bookingId) {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        switch (type) {
            case 'cancel':
                booking.bookingStatus = 'cancelled';
                showToast('error', `Booking ${bookingId} has been cancelled`);
                break;
            case 'checkin':
                booking.bookingStatus = 'checkedin';
                showToast('success', `Booking ${bookingId} checked in successfully`);
                break;
            case 'refund':
                booking.paymentStatus = 'refunded';
                booking.bookingStatus = 'cancelled';
                showToast('info', `Refund processed for ${bookingId} — ${formatCurrency(booking.totalAmount)}`);
                break;
        }

        updateStats();
        applyFilters();

        // Update drawer if open
        if (detailDrawer.classList.contains('active')) {
            openDrawer(bookingId);
        }
    }

    /* =======================================
       DETAIL DRAWER
       ======================================= */
    function openDrawer(bookingId) {
        const b = bookings.find(bk => bk.id === bookingId);
        if (!b) return;

        const tType = THEATER_TYPE_MAP[b.theaterType] || THEATER_TYPE_MAP.standard;

        detailBody.innerHTML = `
            <!-- Movie + Poster header -->
            <div class="drawer-movie-header">
                <div class="drawer-movie-poster">
                    <div class="drawer-poster-placeholder">
                        <i class="fas fa-clapperboard"></i>
                        <span>${b.movie.split(' ')[0]}</span>
                    </div>
                </div>
                <div class="drawer-movie-info">
                    <div class="drawer-movie-title">${b.movie}</div>
                    <div class="drawer-movie-meta">
                        <span class="drawer-booking-id">${b.id}</span>
                        ${theaterTypeBadge(b.theaterType)}
                    </div>
                    <div class="drawer-movie-meta" style="margin-top:4px;">
                        ${bookingBadge(b.bookingStatus)}
                        ${paymentBadge(b.paymentStatus)}
                    </div>
                </div>
            </div>

            <!-- Section 1: Booking Overview -->
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-info-circle" style="margin-right:6px;opacity:0.5;"></i>Booking Overview</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="dl">Booking ID</span>
                        <span class="dv" style="font-family:var(--font-display);color:var(--gold);letter-spacing:0.5px;">${b.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Booked On</span>
                        <span class="dv">${formatDateTime(b.createdAt)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Booking Status</span>
                        <span class="dv">${bookingBadge(b.bookingStatus)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Payment Status</span>
                        <span class="dv">${paymentBadge(b.paymentStatus)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Transaction ID</span>
                        <span class="dv" style="font-family:var(--font-display);color:var(--gold);letter-spacing:0.5px;font-size:13px;">${b.transactionId}</span>
                    </div>
                </div>
            </div>

            <!-- Section 2: Customer Information -->
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-user" style="margin-right:6px;opacity:0.5;"></i>Customer Information</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="dl">Full Name</span>
                        <span class="dv">
                            <span class="drawer-customer-inline">
                                <span class="drawer-customer-avatar">${getInitials(b.customerName)}</span>
                                ${b.customerName}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Email Address</span>
                        <span class="dv"><i class="fas fa-envelope" style="font-size:11px;color:var(--text-muted);margin-right:5px;"></i>${b.email}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Phone Number</span>
                        <span class="dv"><i class="fas fa-phone" style="font-size:11px;color:var(--text-muted);margin-right:5px;"></i>${b.phone}</span>
                    </div>
                </div>
            </div>

            <!-- Section 3: Movie & Showtime -->
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-film" style="margin-right:6px;opacity:0.5;"></i>Movie & Showtime</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="dl">Movie Title</span>
                        <span class="dv" style="font-weight:500;">${b.movie}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Theater</span>
                        <span class="dv">
                            <i class="fas ${tType.icon}" style="font-size:12px;color:var(--text-muted);margin-right:5px;"></i>${b.theater}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Theater Type</span>
                        <span class="dv">${theaterTypeBadge(b.theaterType)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Branch / Location</span>
                        <span class="dv"><i class="fas fa-location-dot" style="font-size:11px;color:var(--text-muted);margin-right:5px;"></i>${b.branch}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Showtime Date</span>
                        <span class="dv"><i class="fas fa-calendar" style="font-size:11px;color:var(--text-muted);margin-right:5px;"></i>${formatDate(b.showtime)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Showtime Time</span>
                        <span class="dv"><i class="fas fa-clock" style="font-size:11px;color:var(--text-muted);margin-right:5px;"></i>${formatTime(b.showtime)}</span>
                    </div>
                </div>
            </div>

            <!-- Section 4: Seats & Tickets -->
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-chair" style="margin-right:6px;opacity:0.5;"></i>Seats & Tickets</div>
                <div class="detail-grid">
                    <div class="detail-item full-width">
                        <span class="dl">Selected Seats</span>
                        <div class="drawer-seats">
                            ${b.seats.map(s => `<span class="drawer-seat-tag">${s}</span>`).join('')}
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Ticket Count</span>
                        <span class="dv" style="font-weight:600;">${b.tickets} ${b.tickets === 1 ? 'ticket' : 'tickets'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Ticket Type</span>
                        <span class="dv">${tType.label} Experience</span>
                    </div>
                </div>
            </div>

            <!-- Section 5: Payment Summary -->
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-credit-card" style="margin-right:6px;opacity:0.5;"></i>Payment Summary</div>
                <div class="price-breakdown">
                    <div class="price-row">
                        <span class="price-label">${b.tickets}× ${tType.label} Ticket @ ${formatCurrency(b.pricePerTicket)}</span>
                        <span class="price-value">${formatCurrency(b.tickets * b.pricePerTicket)}</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">Service Fee</span>
                        <span class="price-value" style="color:var(--text-muted);">0 EGP</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">Discount / Promo</span>
                        <span class="price-value" style="color:var(--text-muted);">—</span>
                    </div>
                    <div class="price-row total">
                        <span class="price-label">Total Paid</span>
                        <span class="price-value">${formatCurrency(b.totalAmount)}</span>
                    </div>
                </div>
                <div class="detail-grid" style="margin-top:var(--space-md);">
                    <div class="detail-item">
                        <span class="dl">Payment Method</span>
                        <span class="dv">${payMethodIcon(b.paymentMethod)}${b.paymentMethod}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Transaction ID</span>
                        <span class="dv" style="font-family:var(--font-display);color:var(--gold);letter-spacing:0.5px;font-size:13px;">${b.transactionId}</span>
                    </div>
                </div>
            </div>

            ${b.notes ? `
            <!-- Notes -->
            <div class="detail-section">
                <div class="detail-section-title"><i class="fas fa-sticky-note" style="margin-right:6px;opacity:0.5;"></i>Notes</div>
                <div class="drawer-notes-card">
                    <i class="fas fa-quote-left" style="color:var(--gold);opacity:0.3;font-size:14px;margin-right:8px;"></i>
                    <span style="color:var(--text-secondary);font-style:italic;font-size:13px;line-height:1.6;">${b.notes}</span>
                </div>
            </div>` : ''}
        `;

        // Update drawer action buttons
        const drawerActions = document.querySelector('.drawer-actions');
        let actionBtns = '';

        if (b.bookingStatus !== 'checkedin' && b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'expired') {
            actionBtns += `<button class="drawer-btn drawer-btn--checkin" data-action="checkin" data-id="${b.id}"><i class="fas fa-check-circle"></i> Check In</button>`;
        }
        if (b.bookingStatus !== 'cancelled') {
            actionBtns += `<button class="drawer-btn drawer-btn--cancel" data-action="cancel" data-id="${b.id}"><i class="fas fa-ban"></i> Cancel</button>`;
        }
        if (b.paymentStatus === 'paid') {
            actionBtns += `<button class="drawer-btn drawer-btn--refund" data-action="refund" data-id="${b.id}"><i class="fas fa-rotate-left"></i> Refund</button>`;
        }

        if (!actionBtns) {
            actionBtns = `<div style="color:var(--text-muted);font-size:13px;text-align:center;width:100%;padding:4px 0;">No actions available for this booking</div>`;
        }

        drawerActions.innerHTML = actionBtns;

        // Bind drawer action buttons
        drawerActions.querySelectorAll('.drawer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                showConfirmModal(action, id);
            });
        });

        // Show drawer
        detailOverlay.classList.add('active');
        detailDrawer.classList.add('active');
    }

    function closeDrawer() {
        detailOverlay.classList.remove('active');
        detailDrawer.classList.remove('active');
    }

    /* =======================================
       TOAST NOTIFICATIONS
       ======================================= */
    function showToast(type, message) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast-item toast-item--${type}`;
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    /* =======================================
       EVENT LISTENERS
       ======================================= */
    function init() {
        // Compute initial stats
        updateStats();

        // Initial render
        applyFilters();

        // Filter listeners
        searchInput.addEventListener('input', applyFilters);
        headerSearch.addEventListener('input', () => {
            searchInput.value = headerSearch.value;
            applyFilters();
        });
        filterMovie.addEventListener('change', applyFilters);
        filterTheater.addEventListener('change', applyFilters);
        filterPayment.addEventListener('change', applyFilters);
        filterBooking.addEventListener('change', applyFilters);
        filterDateFrom.addEventListener('change', applyFilters);
        filterDateTo.addEventListener('change', applyFilters);
        filterSort.addEventListener('change', applyFilters);
        btnClearFilters.addEventListener('click', clearFilters);

        // Drawer close
        detailClose.addEventListener('click', closeDrawer);
        detailOverlay.addEventListener('click', closeDrawer);

        // Keyboard — Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDrawer();
                closeConfirmModal();
                closeAllDropdowns();
            }
        });

        // Export button
        const exportBtn = document.getElementById('btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                showToast('success', `Exported ${filteredBookings.length} bookings to CSV`);
            });
        }

        // Refresh button (empty state)
        const refreshBtn = document.getElementById('empty-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                clearFilters();
            });
        }
    }

    // Boot
    document.addEventListener('DOMContentLoaded', init);

})();
