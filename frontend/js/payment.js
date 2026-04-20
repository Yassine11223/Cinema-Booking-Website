/**
 * Payment.js – Checkout flow for Scene Cinemas
 * Steps: Food & Drinks → Order Summary → Payment → Confirmation
 */
(function () {
    'use strict';

    // ============================================
    // CONFIG
    // ============================================
    const CFG = {
        STORAGE_KEY: 'cinema_bk_v3',
        PAYMENT_KEY: 'cinema_payment_v1',
        CURRENCY: 'EGP',
        SERVICE_FEE_RATE: 0.05,
        TOAST_MS: 4000,
    };

    // ============================================
    // LOYALTY POINTS SYSTEM (localStorage-based)
    // ============================================
    const LOYALTY = {
        STORAGE_KEY: 'cinema_loyalty_v1',
        POINTS_PER_EGP: 0.1,       // 1 point per 10 EGP spent
        DISCOUNT_THRESHOLD: 100,    // Need 100 points to redeem
        DISCOUNT_VALUE: 50,         // 100 points = 50 EGP discount
        CASHBACK_VALUE: 25,         // 100 points = 25 EGP cashback
    };

    function loadLoyalty() {
        try {
            const raw = localStorage.getItem(LOYALTY.STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) { }
        return { points: 0, totalEarned: 0, history: [] };
    }

    function saveLoyalty(data) {
        try { localStorage.setItem(LOYALTY.STORAGE_KEY, JSON.stringify(data)); } catch (_) { }
    }

    function addLoyaltyPoints(amountSpent) {
        const pts = Math.floor(amountSpent * LOYALTY.POINTS_PER_EGP);
        const data = loadLoyalty();
        data.points += pts;
        data.totalEarned += pts;
        data.history.push({ date: new Date().toISOString(), earned: pts, spent: amountSpent });
        saveLoyalty(data);
        return pts;
    }

    function redeemPoints(type) {
        const data = loadLoyalty();
        if (data.points < LOYALTY.DISCOUNT_THRESHOLD) return false;
        data.points -= LOYALTY.DISCOUNT_THRESHOLD;
        saveLoyalty(data);
        return true;
    }

    // ============================================
    // FOOD & DRINKS CATALOG (flavor → size model)
    // ============================================
    const FOOD_MENU = {
        Popcorn: {
            type: 'flavor-size',
            categoryIcon: '🍿',
            flavors: [
                { id: 'cheese', name: 'Cheese', icon: '🧀', color: '#f59e0b' },
                { id: 'caramel', name: 'Caramel', icon: '🍯', color: '#d97706' },
                { id: 'salt', name: 'Salt', icon: '🧂', color: '#94a3b8' },
                { id: 'butter', name: 'Butter', icon: '🧈', color: '#facc15' },
            ],
            sizes: [
                { id: 'small', label: 'Small', price: 60 },
                { id: 'medium', label: 'Medium', price: 90 },
                { id: 'large', label: 'Large', price: 120 },
            ],
        },
        Drinks: {
            type: 'flavor-size',
            categoryIcon: '🥤',
            flavors: [
                { id: 'pepsi', name: 'Pepsi', icon: '🥤', color: '#2563eb' },
                { id: 'pepsi-diet', name: 'Pepsi Diet', icon: '🥤', color: '#60a5fa' },
            ],
            sizes: [
                { id: 'small', label: 'Small', price: 35 },
                { id: 'medium', label: 'Medium', price: 50 },
                { id: 'large', label: 'Large', price: 65 },
            ],
        },
        Slushies: {
            type: 'flavor-size',
            categoryIcon: '🧊',
            flavors: [
                { id: 'coca-cola', name: 'Coca-Cola', icon: '🥤', color: '#dc2626' },
                { id: 'mountain-dew', name: 'Mountain Dew', icon: '🥤', color: '#22c55e' },
                { id: 'blueberry', name: 'Blueberry', icon: '🫐', color: '#6366f1' },
            ],
            sizes: [
                { id: 'small', label: 'Small', price: 45 },
                { id: 'medium', label: 'Medium', price: 65 },
                { id: 'large', label: 'Large', price: 85 },
            ],
        },
        Combos: {
            type: 'flat',
            categoryIcon: '🎬',
            items: [
                { id: 'combo-single', name: 'Popcorn + Drink', desc: 'Any medium popcorn + any medium drink', price: 120, icon: '🎬', savings: 20 },
                { id: 'combo-family', name: 'Family Pack', desc: '2 large popcorns + 4 medium drinks', price: 380, icon: '👨‍👩‍👧‍👦', savings: 80 },
                { id: 'combo-bogo', name: 'Buy 2 Get 1 Free', desc: '3 medium popcorns + 1 medium drink', price: 220, icon: '🎉', savings: 110 },
                { id: 'combo-snack', name: 'Snack Attack', desc: '1 large popcorn + 2 medium drinks + nachos', price: 250, icon: '🔥', savings: 55 },
            ],
        },
        Snacks: {
            type: 'flat',
            categoryIcon: '🍿',
            items: [
                { id: 'snack-nachos', name: 'Nachos', price: 80, icon: '🧀' },
                { id: 'snack-hotdog', name: 'Hot Dog', price: 70, icon: '🌭' },
                { id: 'snack-candy', name: 'Candy', price: 45, icon: '🍬' },
                { id: 'snack-icecream', name: 'Ice Cream', price: 55, icon: '🍦' },
            ],
        },
    };

    // ============================================
    // STEP DEFINITIONS
    // ============================================
    const STEPS = [
        { id: 'food-drinks', label: 'Food & Drinks' },
        { id: 'order-summary', label: 'Summary' },
        { id: 'payment', label: 'Payment' },
        { id: 'confirmation', label: 'Confirmation' },
    ];

    // ============================================
    // HELPERS
    // ============================================
    function resolveCartItemPrice(cartKey) {
        for (const [catName, catData] of Object.entries(FOOD_MENU)) {
            if (catData.type === 'flavor-size') {
                const prefix = catName.toLowerCase();
                if (cartKey.startsWith(prefix + '-')) {
                    const rest = cartKey.slice(prefix.length + 1);
                    const lastDash = rest.lastIndexOf('-');
                    if (lastDash > 0) {
                        const sizeId = rest.slice(lastDash + 1);
                        const sz = catData.sizes.find(s => s.id === sizeId);
                        if (sz) return sz.price;
                    }
                }
            } else if (catData.type === 'flat') {
                const item = catData.items.find(i => i.id === cartKey);
                if (item) return item.price;
            }
        }
        return 0;
    }

    function resolveCartItemName(cartKey) {
        for (const [catName, catData] of Object.entries(FOOD_MENU)) {
            if (catData.type === 'flavor-size') {
                const prefix = catName.toLowerCase();
                if (cartKey.startsWith(prefix + '-')) {
                    const rest = cartKey.slice(prefix.length + 1);
                    const lastDash = rest.lastIndexOf('-');
                    if (lastDash > 0) {
                        const flavorId = rest.slice(0, lastDash);
                        const sizeId = rest.slice(lastDash + 1);
                        const fl = catData.flavors.find(f => f.id === flavorId);
                        const sz = catData.sizes.find(s => s.id === sizeId);
                        if (fl && sz) return { name: `${fl.name} ${catName}`, size: sz.label, icon: fl.icon || catData.categoryIcon, category: catName };
                    }
                }
            } else if (catData.type === 'flat') {
                const item = catData.items.find(i => i.id === cartKey);
                if (item) return { name: item.name, size: null, icon: item.icon, category: catName };
            }
        }
        return { name: cartKey, size: null, icon: '🍿', category: '' };
    }

    // ============================================
    // STATE
    // ============================================
    const S = {
        movie: null,
        dateKey: null,
        dateFull: null,
        stId: null,
        stType: null,
        stTime: null,
        stHall: null,
        seats: [],
        seatPrice: 0,

        currentStep: 0,
        foodCart: {},
        foodCategory: 'Popcorn',
        selectedFlavor: null,
        paymentMethod: null,
        cardData: { number: '', expiry: '', cvv: '', name: '' },
        orderNumber: null,
        confirmed: false,

        loyaltyData: null,
        loyaltyRedemption: null,
        loyaltyPointsEarned: 0,

        get ticketsTotal() { return this.seats.length * this.seatPrice; },
        get foodTotal() {
            let total = 0;
            for (const [id, qty] of Object.entries(this.foodCart)) {
                total += resolveCartItemPrice(id) * qty;
            }
            return total;
        },
        get subtotal() { return this.ticketsTotal + this.foodTotal; },
        get serviceFee() { return Math.round(this.subtotal * CFG.SERVICE_FEE_RATE); },
        get loyaltyDiscount() {
            if (this.loyaltyRedemption === 'discount') return LOYALTY.DISCOUNT_VALUE;
            return 0;
        },
        get grandTotal() { return Math.max(0, this.subtotal + this.serviceFee - this.loyaltyDiscount); },
        get foodItemCount() {
            return Object.values(this.foodCart).reduce((a, b) => a + b, 0);
        },
    };

    // ============================================
    // DOM CACHE
    // ============================================
    const D = {};

    function cacheDom() {
        D.stepsContainer = document.getElementById('pay-steps');
        D.stepPanels = document.querySelectorAll('.pay-step-panel');
        D.progressSteps = document.querySelectorAll('.progress-step');
        D.progressLines = document.querySelectorAll('.progress-line');

        // Food step
        D.foodCats = document.getElementById('food-categories');
        D.foodGrid = document.getElementById('food-grid');
        D.foodRunningTotal = document.getElementById('food-running-total');

        // Summary step
        D.orderSummary = document.getElementById('order-summary-content');

        // Payment step
        D.paymentMethods = document.getElementById('payment-methods');
        D.paymentDetails = document.getElementById('payment-details');

        // Confirmation step
        D.confirmContent = document.getElementById('confirm-content');

        // Bottom bar
        D.bottomBar = document.getElementById('pay-bottom-bar');
        D.bottomTotal = document.getElementById('bottom-total');
        D.btnBack = document.getElementById('btn-back');
        D.btnNext = document.getElementById('btn-next');
    }

    // ============================================
    // DATA LOADING
    // ============================================
    function loadBookingData() {
        try {
            const raw = sessionStorage.getItem(CFG.STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data.movie || !data.seats || data.seats.length === 0) return false;

            S.movie = data.movie;
            S.dateKey = data.dateKey;
            S.dateFull = data.dateFull;
            S.stId = data.stId;
            S.stType = data.stType || 'Standard';
            S.stTime = data.stTime;
            S.stHall = data.stHall || 'Hall 1';
            S.seats = data.seats;
            S.seatPrice = data.seatPrice || 120;
            return true;
        } catch (e) {
            console.error('Failed to load booking data:', e);
            return false;
        }
    }

    function loadDemoData() {
        S.movie = { title: 'Interstellar', rating: '8.7', duration: '2h 49m', genre: 'Sci-Fi' };
        S.dateKey = '2026-04-22';
        S.dateFull = 'Tuesday, April 22';
        S.stId = 'st-1';
        S.stType = 'IMAX';
        S.stTime = '7:30 PM';
        S.stHall = 'Hall 3';
        S.seats = ['E5', 'E6', 'E7'];
        S.seatPrice = 120;
    }

    // ============================================
    // STEP NAVIGATION
    // ============================================
    function goToStep(step) {
        if (step < 0 || step >= STEPS.length) return;
        S.currentStep = step;

        // Update panels
        D.stepPanels.forEach((panel, i) => {
            panel.classList.toggle('active', i === step);
        });

        // Update progress bar
        D.progressSteps.forEach((el, i) => {
            el.classList.remove('active', 'completed');
            if (i === step) el.classList.add('active');
            else if (i < step) el.classList.add('completed');
        });
        D.progressLines.forEach((line, i) => {
            line.classList.toggle('completed', i < step);
        });

        // Render step content
        switch (step) {
            case 0:
                renderFoodCategories();
                renderFoodGrid();
                updateFoodRunningTotal();
                break;
            case 1:
                renderSummaryStep();
                break;
            case 2:
                renderPaymentStep();
                break;
            case 3:
                renderConfirmationStep();
                break;
        }

        updateBottomBar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateBottomBar() {
        const total = S.grandTotal;
        D.bottomTotal.innerHTML = `
            <span class="bottom-total__label">TOTAL</span>
            <span class="bottom-total__value">${total.toLocaleString()} ${CFG.CURRENCY}</span>
        `;

        // Update buttons
        if (S.currentStep === 0) {
            D.btnBack.innerHTML = '<i class="fas fa-arrow-left"></i> BACK TO SEATS';
            D.btnNext.innerHTML = 'ORDER SUMMARY <i class="fas fa-arrow-right"></i>';
            D.btnNext.disabled = false;
        } else if (S.currentStep === 1) {
            D.btnBack.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
            D.btnNext.innerHTML = 'PAYMENT <i class="fas fa-arrow-right"></i>';
            D.btnNext.disabled = false;
        } else if (S.currentStep === 2) {
            D.btnBack.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
            D.btnNext.innerHTML = '<i class="fas fa-lock"></i> CONFIRM & PAY';
            D.btnNext.disabled = !S.paymentMethod;
        } else if (S.currentStep === 3) {
            D.bottomBar.style.display = 'none';
            return;
        }
        D.bottomBar.style.display = '';
    }

    function onBack() {
        if (S.currentStep === 0) {
            window.location.href = 'booking.html';
        } else {
            goToStep(S.currentStep - 1);
        }
    }

    function onNext() {
        if (S.currentStep === 2) {
            if (!S.paymentMethod) {
                toast('Please select a payment method', 'error');
                return;
            }
            if (S.paymentMethod === 'card') {
                if (!validateCard()) return;
            }
            processPayment();
        } else {
            goToStep(S.currentStep + 1);
        }
    }

    // ============================================
    // STEP 1: FOOD & DRINKS
    // ============================================
    function renderFoodCategories() {
        const cats = Object.keys(FOOD_MENU);
        D.foodCats.innerHTML = cats.map(cat => {
            const catData = FOOD_MENU[cat];
            return `
                <button class="food-cat-btn ${cat === S.foodCategory ? 'active' : ''}"
                        data-cat="${cat}" id="food-cat-${cat.toLowerCase()}">
                    <span class="food-cat-btn__icon">${catData.categoryIcon}</span> ${cat}
                </button>
            `;
        }).join('');
    }

    function renderFoodGrid() {
        const catData = FOOD_MENU[S.foodCategory];
        if (!catData) { D.foodGrid.innerHTML = ''; return; }

        if (catData.type === 'flavor-size') {
            renderFlavorSizeCategory(catData);
        } else {
            renderFlatCategory(catData);
        }
    }

    function renderFlavorSizeCategory(catData) {
        const catPrefix = S.foodCategory.toLowerCase();

        // Override parent grid to block for flavor-size layout
        D.foodGrid.style.display = 'block';

        let html = '<div class="flavor-picker">';
        catData.flavors.forEach(fl => {
            const isSelected = S.selectedFlavor === fl.id;
            html += `
                <button class="flavor-card ${isSelected ? 'selected' : ''}" 
                        data-flavor="${fl.id}" style="--flavor-color: ${fl.color}">
                    <span class="flavor-card__icon">${fl.icon}</span>
                    <span class="flavor-card__name">${fl.name}</span>
                </button>
            `;
        });
        html += '</div>';

        if (S.selectedFlavor) {
            const flavor = catData.flavors.find(f => f.id === S.selectedFlavor);
            html += `<div class="size-picker">`;
            html += `<div class="size-picker__title">Choose size for <strong>${flavor ? flavor.name : ''}</strong></div>`;
            html += `<div class="size-picker__options">`;
            catData.sizes.forEach(sz => {
                const compositeId = `${catPrefix}-${S.selectedFlavor}-${sz.id}`;
                const qty = S.foodCart[compositeId] || 0;
                html += `
                    <div class="size-option ${qty > 0 ? 'has-items' : ''}" id="food-item-${compositeId}">
                        <div class="size-option__header">
                            <span class="size-option__label">${sz.label}</span>
                            <span class="size-option__price">${sz.price} ${CFG.CURRENCY}</span>
                        </div>
                        <div class="food-qty">
                            <button class="food-qty__btn" data-id="${compositeId}" data-action="dec" 
                                    aria-label="Decrease ${sz.label}">−</button>
                            <span class="food-qty__count" id="food-count-${compositeId}">${qty}</span>
                            <button class="food-qty__btn" data-id="${compositeId}" data-action="inc" 
                                    aria-label="Increase ${sz.label}">+</button>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        D.foodGrid.innerHTML = html;
    }

    function renderFlatCategory(catData) {
        const items = catData.items || [];
        const isCombo = S.foodCategory === 'Combos';

        // Reset to default grid layout for flat items
        D.foodGrid.style.display = '';

        D.foodGrid.innerHTML = items.map(item => {
            const qty = S.foodCart[item.id] || 0;
            if (isCombo) {
                return `
                    <div class="food-card combo-card ${qty > 0 ? 'has-items' : ''}" id="food-item-${item.id}">
                        ${item.savings ? `<div class="combo-card__savings">Save ${item.savings} ${CFG.CURRENCY}</div>` : ''}
                        <span class="food-card__icon">${item.icon}</span>
                        <div class="food-card__name">${item.name}</div>
                        ${item.desc ? `<div class="combo-card__desc">${item.desc}</div>` : ''}
                        <div class="food-card__price">${item.price} ${CFG.CURRENCY}</div>
                        <div class="food-qty">
                            <button class="food-qty__btn" data-id="${item.id}" data-action="dec" 
                                    id="food-dec-${item.id}" aria-label="Decrease ${item.name}">−</button>
                            <span class="food-qty__count" id="food-count-${item.id}">${qty}</span>
                            <button class="food-qty__btn" data-id="${item.id}" data-action="inc" 
                                    id="food-inc-${item.id}" aria-label="Increase ${item.name}">+</button>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="food-card ${qty > 0 ? 'has-items' : ''}" id="food-item-${item.id}">
                    <span class="food-card__icon">${item.icon}</span>
                    <div class="food-card__name">${item.name}</div>
                    <div class="food-card__price">${item.price} ${CFG.CURRENCY}</div>
                    <div class="food-qty">
                        <button class="food-qty__btn" data-id="${item.id}" data-action="dec" 
                                id="food-dec-${item.id}" aria-label="Decrease ${item.name}">−</button>
                        <span class="food-qty__count" id="food-count-${item.id}">${qty}</span>
                        <button class="food-qty__btn" data-id="${item.id}" data-action="inc" 
                                id="food-inc-${item.id}" aria-label="Increase ${item.name}">+</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateFoodRunningTotal() {
        const total = S.foodTotal;
        const count = S.foodItemCount;
        let label = 'Food & Drinks Total';
        if (count > 0) label += ` (${count} item${count !== 1 ? 's' : ''})`;
        D.foodRunningTotal.innerHTML = `
            <span class="food-running-total__label">${label}</span>
            <span class="food-running-total__amount">${total.toLocaleString()} ${CFG.CURRENCY}</span>
        `;
    }

    function onFoodQtyChange(itemId, action) {
        const current = S.foodCart[itemId] || 0;
        if (action === 'inc') {
            S.foodCart[itemId] = current + 1;
        } else if (action === 'dec' && current > 0) {
            S.foodCart[itemId] = current - 1;
            if (S.foodCart[itemId] === 0) delete S.foodCart[itemId];
        }

        const countEl = document.getElementById(`food-count-${itemId}`);
        const cardEl = document.getElementById(`food-item-${itemId}`);
        if (countEl) {
            const newQty = S.foodCart[itemId] || 0;
            countEl.textContent = newQty;
            countEl.style.transform = 'scale(1.3)';
            setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 150);
        }
        if (cardEl) {
            cardEl.classList.toggle('has-items', (S.foodCart[itemId] || 0) > 0);
        }

        updateFoodRunningTotal();
        updateBottomBar();
    }

    // ============================================
    // STEP 2: ORDER SUMMARY
    // ============================================
    function renderSummaryStep() {
        const sortedSeats = S.seats.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        let ticketLines = '';
        sortedSeats.forEach(seat => {
            ticketLines += `
                <div class="order-line">
                    <span class="order-line__label">
                        Seat ${seat}
                        <span class="order-line__label-dim">${S.stType}</span>
                    </span>
                    <span class="order-line__value">${S.seatPrice.toLocaleString()} ${CFG.CURRENCY}</span>
                </div>
            `;
        });

        let foodLines = '';
        let hasFoodItems = false;
        for (const [id, qty] of Object.entries(S.foodCart)) {
            if (qty <= 0) continue;
            hasFoodItems = true;
            const info = resolveCartItemName(id);
            const price = resolveCartItemPrice(id);
            const sizeLabel = info.size ? ` — ${info.size}` : '';
            foodLines += `
                <div class="order-line">
                    <span class="order-line__label">
                        ${info.icon} ${info.name}${sizeLabel}
                        <span class="order-line__qty">×${qty}</span>
                    </span>
                    <span class="order-line__value">${(price * qty).toLocaleString()} ${CFG.CURRENCY}</span>
                </div>
            `;
        }

        let dateDisplay = S.dateFull;
        try {
            const d = new Date(S.dateKey);
            dateDisplay = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        } catch (e) { }

        // Loyalty section
        let loyaltyHtml = '';
        if (S.loyaltyData && S.loyaltyData.points > 0) {
            const canRedeem = S.loyaltyData.points >= LOYALTY.DISCOUNT_THRESHOLD;
            loyaltyHtml = `
                <div class="loyalty-banner">
                    <div class="loyalty-banner__header">
                        <i class="fas fa-crown"></i>
                        <span class="loyalty-banner__title">Loyalty Rewards</span>
                        <span class="loyalty-banner__points">${S.loyaltyData.points} pts</span>
                    </div>
                    ${canRedeem ? `
                    <div class="loyalty-redeem">
                        <div class="loyalty-redeem__hint">You have enough points to redeem a reward!</div>
                        <div class="loyalty-redeem__options">
                            <button class="loyalty-redeem__card ${S.loyaltyRedemption === 'discount' ? 'applied' : ''}" 
                                    data-redeem="discount" id="loyalty-redeem-discount">
                                <i class="fas fa-tag"></i>
                                <span class="loyalty-redeem__card-title">${LOYALTY.DISCOUNT_VALUE} ${CFG.CURRENCY} Off</span>
                                <span class="loyalty-redeem__card-cost">${LOYALTY.DISCOUNT_THRESHOLD} pts</span>
                            </button>
                            <button class="loyalty-redeem__card ${S.loyaltyRedemption === 'cashback' ? 'applied' : ''}" 
                                    data-redeem="cashback" id="loyalty-redeem-cashback">
                                <i class="fas fa-coins"></i>
                                <span class="loyalty-redeem__card-title">${LOYALTY.CASHBACK_VALUE} ${CFG.CURRENCY} Cashback</span>
                                <span class="loyalty-redeem__card-cost">${LOYALTY.DISCOUNT_THRESHOLD} pts</span>
                            </button>
                        </div>
                        ${S.loyaltyRedemption ? `<button class="loyalty-redeem__clear" id="loyalty-clear">Remove reward</button>` : ''}
                    </div>
                    ` : `
                    <div class="loyalty-redeem__hint">Earn ${LOYALTY.DISCOUNT_THRESHOLD - S.loyaltyData.points} more points to unlock rewards!</div>
                    `}
                </div>
            `;
        }

        D.orderSummary.innerHTML = `
            <div class="order-summary">
                <div class="order-movie-info">
                    <div class="order-movie-info__poster">
                        <i class="fas fa-film"></i>
                    </div>
                    <div class="order-movie-info__details">
                        <div class="order-movie-info__title">${S.movie.title}</div>
                        <div class="order-movie-info__meta">
                            <span class="order-movie-info__tag"><i class="fas fa-star"></i> ${S.movie.rating}</span>
                            <span class="order-movie-info__tag"><i class="far fa-clock"></i> ${S.movie.duration}</span>
                            <span class="order-movie-info__tag">${S.stType}</span>
                            <span class="order-movie-info__tag">${S.stHall}</span>
                        </div>
                    </div>
                </div>

                <div class="order-section">
                    <div class="order-section__title"><i class="far fa-calendar-alt"></i> Date & Time</div>
                    <div class="order-line">
                        <span class="order-line__label">Date</span>
                        <span class="order-line__value">${dateDisplay}</span>
                    </div>
                    <div class="order-line">
                        <span class="order-line__label">Showtime</span>
                        <span class="order-line__value">${S.stTime}</span>
                    </div>
                    <div class="order-line">
                        <span class="order-line__label">Experience</span>
                        <span class="order-line__value">${S.stType} · ${S.stHall}</span>
                    </div>
                </div>

                <div class="order-section">
                    <div class="order-section__title"><i class="fas fa-ticket-alt"></i> Tickets (${S.seats.length})</div>
                    ${ticketLines}
                </div>

                ${hasFoodItems ? `
                <div class="order-section">
                    <div class="order-section__title"><i class="fas fa-utensils"></i> Food & Drinks</div>
                    ${foodLines}
                </div>
                ` : ''}

                ${loyaltyHtml}

                <div class="order-totals">
                    <div class="order-total-line">
                        <span class="order-total-line__label">Tickets Subtotal</span>
                        <span class="order-total-line__value">${S.ticketsTotal.toLocaleString()} ${CFG.CURRENCY}</span>
                    </div>
                    ${hasFoodItems ? `
                    <div class="order-total-line">
                        <span class="order-total-line__label">Food & Drinks</span>
                        <span class="order-total-line__value">${S.foodTotal.toLocaleString()} ${CFG.CURRENCY}</span>
                    </div>
                    ` : ''}
                    <div class="order-total-line">
                        <span class="order-total-line__label">Service Fee (5%)</span>
                        <span class="order-total-line__value">${S.serviceFee.toLocaleString()} ${CFG.CURRENCY}</span>
                    </div>
                    ${S.loyaltyDiscount > 0 ? `
                    <div class="order-total-line order-total-line--discount">
                        <span class="order-total-line__label"><i class="fas fa-crown"></i> Loyalty Discount</span>
                        <span class="order-total-line__value">-${S.loyaltyDiscount.toLocaleString()} ${CFG.CURRENCY}</span>
                    </div>
                    ` : ''}
                    <div class="order-grand-total">
                        <span class="order-grand-total__label">Grand Total</span>
                        <span class="order-grand-total__value">${S.grandTotal.toLocaleString()} ${CFG.CURRENCY}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // STEP 3: PAYMENT
    // ============================================
    function renderPaymentStep() {
        D.paymentMethods.innerHTML = `
            <div class="payment-method-card ${S.paymentMethod === 'cash' ? 'selected' : ''}" 
                 data-method="cash" id="pay-method-cash">
                <div class="payment-method-card__radio ${S.paymentMethod === 'cash' ? 'checked' : ''}"></div>
                <div class="payment-method-card__icon"><i class="fas fa-money-bill-wave"></i></div>
                <div class="payment-method-card__title">Pay by Cash</div>
                <div class="payment-method-card__desc">Pay at the cinema counter before your show</div>
            </div>
            <div class="payment-method-card ${S.paymentMethod === 'card' ? 'selected' : ''}" 
                 data-method="card" id="pay-method-card">
                <div class="payment-method-card__radio ${S.paymentMethod === 'card' ? 'checked' : ''}"></div>
                <div class="payment-method-card__icon"><i class="fas fa-credit-card"></i></div>
                <div class="payment-method-card__title">Pay by Card</div>
                <div class="payment-method-card__desc">Secure online payment with credit or debit card</div>
            </div>
        `;
        renderPaymentDetails();
    }

    function onPaymentMethodSelect(method) {
        S.paymentMethod = method;
        renderPaymentStep();
        updateBottomBar();
    }

    function renderPaymentDetails() {
        if (!S.paymentMethod) {
            D.paymentDetails.innerHTML = '';
            return;
        }

        if (S.paymentMethod === 'cash') {
            D.paymentDetails.innerHTML = `
                <div class="payment-cash-info">
                    <div class="payment-cash-info__icon"><i class="fas fa-store"></i></div>
                    <h3 class="payment-cash-info__title">PAY AT COUNTER</h3>
                    <p class="payment-cash-info__desc">
                        Present your order confirmation QR code at the cinema counter.
                        Our staff will process your cash payment before the show.
                        Please arrive at least 15 minutes before showtime.
                    </p>
                </div>
            `;
        } else if (S.paymentMethod === 'card') {
            D.paymentDetails.innerHTML = `
                <div class="payment-card-form">
                    <div class="card-visual" id="card-visual">
                        <div class="card-visual__chip"></div>
                        <div class="card-visual__number" id="card-visual-number">•••• •••• •••• ••••</div>
                        <div class="card-visual__bottom">
                            <div class="card-visual__name" id="card-visual-name">CARDHOLDER NAME</div>
                            <div class="card-visual__expiry" id="card-visual-expiry">MM/YY</div>
                        </div>
                    </div>
                    <div class="card-form-fields">
                        <div class="card-field">
                            <label class="card-field__label" for="card-number">Card Number</label>
                            <input type="text" id="card-number" class="card-field__input" 
                                   placeholder="1234 5678 9012 3456" maxlength="19"
                                   value="${S.cardData.number}" autocomplete="cc-number">
                        </div>
                        <div class="card-field-row">
                            <div class="card-field">
                                <label class="card-field__label" for="card-expiry">Expiry</label>
                                <input type="text" id="card-expiry" class="card-field__input" 
                                       placeholder="MM/YY" maxlength="5"
                                       value="${S.cardData.expiry}" autocomplete="cc-exp">
                            </div>
                            <div class="card-field">
                                <label class="card-field__label" for="card-cvv">CVV</label>
                                <input type="text" id="card-cvv" class="card-field__input" 
                                       placeholder="123" maxlength="3"
                                       value="${S.cardData.cvv}" autocomplete="cc-csc">
                            </div>
                        </div>
                        <div class="card-field">
                            <label class="card-field__label" for="card-name">Cardholder Name</label>
                            <input type="text" id="card-name" class="card-field__input" 
                                   placeholder="John Doe"
                                   value="${S.cardData.name}" autocomplete="cc-name">
                        </div>
                    </div>
                </div>
            `;

            // Re-bind card input handlers
            const cardNumInput = document.getElementById('card-number');
            const cardExpInput = document.getElementById('card-expiry');
            const cardCvvInput = document.getElementById('card-cvv');
            const cardNameInput = document.getElementById('card-name');

            if (cardNumInput) cardNumInput.addEventListener('input', maskCardNumber);
            if (cardExpInput) cardExpInput.addEventListener('input', maskCardExpiry);
            if (cardCvvInput) cardCvvInput.addEventListener('input', maskCardCVV);
            if (cardNameInput) cardNameInput.addEventListener('input', updateCardVisualName);
        }
    }

    // Card masking
    function maskCardNumber(e) {
        let v = e.target.value.replace(/\D/g, '').slice(0, 16);
        v = v.replace(/(.{4})/g, '$1 ').trim();
        e.target.value = v;
        S.cardData.number = v;
        const display = v || '•••• •••• •••• ••••';
        const el = document.getElementById('card-visual-number');
        if (el) el.textContent = display;
    }

    function maskCardExpiry(e) {
        let v = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
        e.target.value = v;
        S.cardData.expiry = v;
        const el = document.getElementById('card-visual-expiry');
        if (el) el.textContent = v || 'MM/YY';
    }

    function maskCardCVV(e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        S.cardData.cvv = e.target.value;
    }

    function updateCardVisualName(e) {
        S.cardData.name = e.target.value;
        const el = document.getElementById('card-visual-name');
        if (el) el.textContent = e.target.value.toUpperCase() || 'CARDHOLDER NAME';
    }

    function validateCard() {
        const { number, expiry, cvv, name } = S.cardData;
        if (number.replace(/\s/g, '').length < 16) {
            toast('Please enter a valid 16-digit card number', 'error');
            return false;
        }
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            toast('Please enter a valid expiry date (MM/YY)', 'error');
            return false;
        }
        if (cvv.length < 3) {
            toast('Please enter a valid 3-digit CVV', 'error');
            return false;
        }
        if (name.trim().length < 2) {
            toast('Please enter the cardholder name', 'error');
            return false;
        }
        return true;
    }

    // ============================================
    // PAYMENT PROCESSING
    // ============================================
    function processPayment() {
        S.orderNumber = generateOrderNumber();
        S.confirmed = true;

        // Award loyalty points
        S.loyaltyPointsEarned = addLoyaltyPoints(S.grandTotal);

        // Deduct loyalty points if redeemed
        if (S.loyaltyRedemption && S.loyaltyData) {
            redeemPoints(S.loyaltyRedemption);
        }

        try { sessionStorage.removeItem(CFG.STORAGE_KEY); } catch (e) { }

        goToStep(3);
        toast('Payment successful!', 'success');
    }

    function generateOrderNumber() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'SCN-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ============================================
    // STEP 4: CONFIRMATION
    // ============================================
    function renderConfirmationStep() {
        const sortedSeats = S.seats.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        let dateDisplay = S.dateFull;
        try {
            const d = new Date(S.dateKey);
            dateDisplay = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch (e) { }

        const now = new Date();
        const receiptDate = now.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        let foodReceiptLines = '';
        for (const [id, qty] of Object.entries(S.foodCart)) {
            if (qty <= 0) continue;
            const info = resolveCartItemName(id);
            const price = resolveCartItemPrice(id);
            const sizeLabel = info.size ? ` (${info.size})` : '';
            foodReceiptLines += `
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">${info.icon} ${info.name}${sizeLabel} ×${qty}</span>
                    <span class="confirm-receipt__line-value">${(price * qty).toLocaleString()} ${CFG.CURRENCY}</span>
                </div>
            `;
        }

        const payMethodLabel = S.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash at Counter';

        const updatedLoyalty = loadLoyalty();
        let loyaltyEarnedHtml = '';
        if (S.loyaltyPointsEarned > 0) {
            loyaltyEarnedHtml = `
                <div class="loyalty-earned">
                    <i class="fas fa-crown"></i>
                    <div class="loyalty-earned__text">
                        <strong>+${S.loyaltyPointsEarned} points earned!</strong>
                        <span>Total balance: ${updatedLoyalty.points} pts</span>
                    </div>
                </div>
            `;
        }

        let cashbackHtml = '';
        if (S.loyaltyRedemption === 'cashback') {
            cashbackHtml = `
                <div class="confirm-cashback">
                    <i class="fas fa-coins"></i>
                    <span>${LOYALTY.CASHBACK_VALUE} ${CFG.CURRENCY} cashback will be credited to your account</span>
                </div>
            `;
        }

        D.confirmContent.innerHTML = `
            <div class="confirm-success-icon">
                <i class="fas fa-check"></i>
            </div>

            <h2 class="confirm-title">Booking Confirmed!</h2>
            <p class="confirm-subtitle">Your tickets have been reserved. ${S.paymentMethod === 'cash' ? 'Present this at the counter to pay.' : 'Payment received successfully.'}</p>

            ${loyaltyEarnedHtml}
            ${cashbackHtml}

            <div class="confirm-order-number">
                <span class="confirm-order-number__label">Order No.</span>
                <span class="confirm-order-number__value">${S.orderNumber}</span>
            </div>

            <div class="confirm-qr" id="confirm-qr-container"></div>
            <p class="confirm-qr-hint">Scan this QR code at the cinema entrance</p>

            <div class="confirm-receipt">
                <div class="confirm-receipt__header">
                    <span class="confirm-receipt__brand">
                        <span class="confirm-receipt__brand-red">SCENE</span>CINEMAS
                    </span>
                    <span class="confirm-receipt__date">${receiptDate}</span>
                </div>

                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Movie</span>
                    <span class="confirm-receipt__line-value">${S.movie.title}</span>
                </div>
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Date</span>
                    <span class="confirm-receipt__line-value">${dateDisplay}</span>
                </div>
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Time</span>
                    <span class="confirm-receipt__line-value">${S.stTime}</span>
                </div>
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Experience</span>
                    <span class="confirm-receipt__line-value">${S.stType}</span>
                </div>
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Hall</span>
                    <span class="confirm-receipt__line-value">${S.stHall}</span>
                </div>
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Seats</span>
                    <span class="confirm-receipt__line-value">${sortedSeats.join(', ')}</span>
                </div>

                <hr class="confirm-receipt__divider">

                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Tickets (${S.seats.length}× ${S.seatPrice} ${CFG.CURRENCY})</span>
                    <span class="confirm-receipt__line-value">${S.ticketsTotal.toLocaleString()} ${CFG.CURRENCY}</span>
                </div>

                ${foodReceiptLines}

                ${S.foodTotal > 0 ? `
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Food & Drinks</span>
                    <span class="confirm-receipt__line-value">${S.foodTotal.toLocaleString()} ${CFG.CURRENCY}</span>
                </div>
                ` : ''}

                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Service Fee (5%)</span>
                    <span class="confirm-receipt__line-value">${S.serviceFee.toLocaleString()} ${CFG.CURRENCY}</span>
                </div>

                ${S.loyaltyDiscount > 0 ? `
                <div class="confirm-receipt__line confirm-receipt__line--discount">
                    <span class="confirm-receipt__line-label"><i class="fas fa-crown"></i> Loyalty Discount</span>
                    <span class="confirm-receipt__line-value">-${S.loyaltyDiscount.toLocaleString()} ${CFG.CURRENCY}</span>
                </div>
                ` : ''}

                <hr class="confirm-receipt__divider">

                <div class="confirm-receipt__total">
                    <span class="confirm-receipt__total-label">Total</span>
                    <span class="confirm-receipt__total-value">${S.grandTotal.toLocaleString()} ${CFG.CURRENCY}</span>
                </div>

                <hr class="confirm-receipt__divider">

                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Payment</span>
                    <span class="confirm-receipt__line-value">${payMethodLabel}</span>
                </div>
                <div class="confirm-receipt__line">
                    <span class="confirm-receipt__line-label">Order No.</span>
                    <span class="confirm-receipt__line-value">${S.orderNumber}</span>
                </div>
            </div>

            <div class="confirm-actions">
                <button class="confirm-btn confirm-btn--primary" id="btn-home">
                    <i class="fas fa-home"></i> Back to Home
                </button>
                <button class="confirm-btn confirm-btn--secondary" id="btn-print">
                    <i class="fas fa-print"></i> Print Receipt
                </button>
            </div>
        `;

        setTimeout(() => {
            generateQR();
            launchConfetti();
        }, 300);
    }

    // ============================================
    // QR CODE GENERATOR (simple canvas-based)
    // ============================================
    function generateQR() {
        const container = document.getElementById('confirm-qr-container');
        if (!container) return;

        const data = `SCN|${S.orderNumber}|${S.movie.title}|${S.stTime}|${S.seats.join(',')}`;
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Generate a pseudo-QR pattern from order data
        const modules = 21;
        const cellSize = size / modules;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000000';

        // Finder patterns (top-left, top-right, bottom-left)
        drawFinderPattern(ctx, 0, 0, cellSize);
        drawFinderPattern(ctx, (modules - 7) * cellSize, 0, cellSize);
        drawFinderPattern(ctx, 0, (modules - 7) * cellSize, cellSize);

        // Data modules based on hash of order data
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
        }
        for (let row = 0; row < modules; row++) {
            for (let col = 0; col < modules; col++) {
                // Skip finder patterns
                if ((row < 8 && col < 8) || (row < 8 && col >= modules - 8) || (row >= modules - 8 && col < 8)) continue;
                // Pseudo-random fill
                const seed = (hash + row * 31 + col * 37) & 0xFFFF;
                if (seed % 3 !== 0) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }

        container.innerHTML = '';
        container.appendChild(canvas);
    }

    function drawFinderPattern(ctx, x, y, cellSize) {
        // Outer 7×7 border
        ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
        // Inner white 5×5
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
        // Inner black 3×3
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }

    // ============================================
    // CONFETTI
    // ============================================
    function launchConfetti() {
        const canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');

        const colors = ['#e53935', '#d4af37', '#43a047', '#1e88e5', '#ff6f00', '#8e24aa'];
        const pieces = [];
        for (let i = 0; i < 120; i++) {
            pieces.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * -1,
                w: Math.random() * 8 + 4,
                h: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: (Math.random() - 0.5) * 2,
                rot: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
            });
        }

        let frame = 0;
        function animate() {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            pieces.forEach(p => {
                if (p.opacity <= 0) return;
                alive = true;
                p.y += p.vy;
                p.x += p.vx;
                p.rot += p.rotSpeed;
                if (frame > 60) p.opacity -= 0.01;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rot * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (alive && frame < 300) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }
        requestAnimationFrame(animate);
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    function toast(message, type = 'info') {
        const existing = document.querySelector('.pay-toast');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.className = `pay-toast pay-toast--${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        el.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        document.body.appendChild(el);

        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 400);
        }, CFG.TOAST_MS);
    }

    // ============================================
    // EVENT BINDINGS
    // ============================================
    function bind() {
        // Food category tabs
        D.foodCats.addEventListener('click', e => {
            const btn = e.target.closest('.food-cat-btn');
            if (btn) {
                S.foodCategory = btn.dataset.cat;
                S.selectedFlavor = null;
                renderFoodCategories();
                renderFoodGrid();
            }
        });

        // Food grid: quantity buttons AND flavor card clicks
        D.foodGrid.addEventListener('click', e => {
            const qtyBtn = e.target.closest('.food-qty__btn');
            if (qtyBtn) {
                onFoodQtyChange(qtyBtn.dataset.id, qtyBtn.dataset.action);
                return;
            }
            const flavorCard = e.target.closest('.flavor-card');
            if (flavorCard) {
                const flavorId = flavorCard.dataset.flavor;
                S.selectedFlavor = S.selectedFlavor === flavorId ? null : flavorId;
                renderFoodGrid();
                return;
            }
        });

        // Payment method cards
        D.paymentMethods.addEventListener('click', e => {
            const card = e.target.closest('.payment-method-card');
            if (card) onPaymentMethodSelect(card.dataset.method);
        });

        // Bottom bar buttons
        D.btnBack.addEventListener('click', onBack);
        D.btnNext.addEventListener('click', onNext);

        // Confirmation buttons + Loyalty redemption (delegated)
        document.addEventListener('click', e => {
            if (e.target.closest('#btn-home')) {
                window.location.href = 'index.html';
            }
            if (e.target.closest('#btn-print')) {
                window.print();
            }
            // Loyalty redemption
            const redeemCard = e.target.closest('.loyalty-redeem__card');
            if (redeemCard) {
                const type = redeemCard.dataset.redeem;
                if (S.loyaltyRedemption === type) {
                    S.loyaltyRedemption = null;
                } else {
                    S.loyaltyRedemption = type;
                }
                renderSummaryStep();
                updateBottomBar();
            }
            if (e.target.closest('#loyalty-clear')) {
                S.loyaltyRedemption = null;
                renderSummaryStep();
                updateBottomBar();
            }
        });

        // Back to booking link
        const backBtn = document.getElementById('pay-back-booking');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'booking.html';
            });
        }
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        cacheDom();

        const hasData = loadBookingData();
        if (!hasData) {
            loadDemoData();
        }

        // Load loyalty data
        S.loyaltyData = loadLoyalty();

        bind();
        goToStep(0);
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
