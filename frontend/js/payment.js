/**
 * payment.js — 3-step payment flow
 * Step 1: Food & Drinks add-on
 * Step 2: Payment method (Visa / Fawry)
 * Step 3: Booking confirmation
 */
(function () {
    'use strict';

    /* =========================================================
       FOOD MENU DATA (matching food-drinks.html)
       ========================================================= */
    const FOOD_MENU = [
        { id:'popcorn-butter',   cat:'Popcorn',   emoji:'🧈', name:'Classic Butter Popcorn',   price:160 },
        { id:'popcorn-caramel',  cat:'Popcorn',   emoji:'🍯', name:'Caramel Drizzle Popcorn',  price:170 },
        { id:'popcorn-cheese',   cat:'Popcorn',   emoji:'🧀', name:'Cheddar Cheese Popcorn',   price:170 },
        { id:'popcorn-spicy',    cat:'Popcorn',   emoji:'🌶️', name:'Spicy Jalapeño Popcorn',   price:170 },
        { id:'nachos',           cat:'Snacks',    emoji:'🫕', name:'Loaded Nachos',            price:180 },
        { id:'hotdog',           cat:'Snacks',    emoji:'🌭', name:'Classic Hot Dog',          price:140 },
        { id:'pretzel',          cat:'Snacks',    emoji:'🥨', name:'Soft Pretzel',             price:120 },
        { id:'mozz-sticks',      cat:'Snacks',    emoji:'🧀', name:'Mozzarella Sticks',        price:150 },
        { id:'candy',            cat:'Snacks',    emoji:'🍬', name:'Candy Box',                price:100 },
        { id:'soft-drink',       cat:'Drinks',    emoji:'🥤', name:'Soft Drink (Medium)',      price:120 },
        { id:'iced-tea',         cat:'Drinks',    emoji:'🍵', name:'Iced Tea (Medium)',        price:130 },
        { id:'water',            cat:'Drinks',    emoji:'💧', name:'Bottled Water',            price:60 },
        { id:'slushie',          cat:'Drinks',    emoji:'🧊', name:'Frozen Slushie',           price:140 },
        { id:'coffee',           cat:'Drinks',    emoji:'☕', name:'Hot Coffee',               price:100 },
    ];

    /* =========================================================
       STATE
       ========================================================= */
    let currentStep = 1;
    let cart = {};  // { itemId: qty }
    let booking = null;
    let paymentMethod = 'card';
    let bookingNumber = '';

    /* =========================================================
       DOM
       ========================================================= */
    const $ = id => document.getElementById(id);

    /* =========================================================
       INIT
       ========================================================= */
    function init() {
        // Load booking summary
        try {
            booking = JSON.parse(sessionStorage.getItem('bookingSummary'));
        } catch (_) {}

        if (!booking) {
            document.querySelector('.payment-page').innerHTML = `
                <div style="text-align:center;padding:100px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--primary-light);margin-bottom:20px;"></i>
                    <h2 style="font-family:var(--font-display);letter-spacing:2px;margin-bottom:10px;">NO BOOKING FOUND</h2>
                    <p style="color:var(--text-muted);margin-bottom:20px;">Please select a movie and complete the seat selection first.</p>
                    <a href="index.html" class="pay-btn pay-btn-primary">BROWSE MOVIES</a>
                </div>`;
            return;
        }

        renderFoodMenu();
        renderStep(1);
        bindEvents();
    }

    document.addEventListener('DOMContentLoaded', init);

    /* =========================================================
       RENDER FOOD MENU (Step 1)
       ========================================================= */
    function renderFoodMenu() {
        const container = $('food-menu-container');
        if (!container) return;

        const categories = [...new Set(FOOD_MENU.map(f => f.cat))];
        let html = '';

        categories.forEach(cat => {
            html += `<div class="food-category-title">${cat} <span class="line"></span></div>`;
            html += '<div class="food-grid">';
            FOOD_MENU.filter(f => f.cat === cat).forEach(item => {
                const qty = cart[item.id] || 0;
                html += `
                    <div class="food-card ${qty > 0 ? 'in-cart' : ''}" data-id="${item.id}">
                        <div class="food-emoji">${item.emoji}</div>
                        <div class="food-info">
                            <div class="food-name">${item.name}</div>
                            <div class="food-price">${item.price} EGP</div>
                        </div>
                        <div class="food-controls">
                            <button class="food-btn food-minus" data-id="${item.id}" ${qty === 0 ? 'style="visibility:hidden"' : ''}>−</button>
                            <span class="food-qty" data-qty-id="${item.id}">${qty}</span>
                            <button class="food-btn food-plus" data-id="${item.id}">+</button>
                        </div>
                    </div>`;
            });
            html += '</div>';
        });

        container.innerHTML = html;
    }

    /* =========================================================
       EVENTS
       ========================================================= */
    function bindEvents() {
        // Food add/remove
        document.addEventListener('click', e => {
            const plus = e.target.closest('.food-plus');
            const minus = e.target.closest('.food-minus');

            if (plus) {
                const id = plus.dataset.id;
                cart[id] = (cart[id] || 0) + 1;
                updateFoodCard(id);
                updateCartBar();
            }

            if (minus) {
                const id = minus.dataset.id;
                if (cart[id] > 0) {
                    cart[id]--;
                    if (cart[id] === 0) delete cart[id];
                }
                updateFoodCard(id);
                updateCartBar();
            }
        });

        // Skip food button
        $('btn-skip-food')?.addEventListener('click', () => {
            cart = {};
            goToStep(2);
        });

        // Continue to payment with food
        $('btn-continue-payment')?.addEventListener('click', () => goToStep(2));

        // Payment method tabs
        document.querySelectorAll('.pay-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                paymentMethod = tab.dataset.method;
                document.querySelectorAll('.pay-panel').forEach(p => p.classList.remove('active'));
                $(`panel-${paymentMethod}`)?.classList.add('active');
            });
        });

        // Pay button
        $('btn-pay-now')?.addEventListener('click', processPayment);

        // Back buttons
        $('btn-back-to-food')?.addEventListener('click', () => goToStep(1));

        // Print ticket
        $('btn-print-ticket')?.addEventListener('click', () => window.print());
    }

    /* =========================================================
       FOOD CARD UPDATE
       ========================================================= */
    function updateFoodCard(id) {
        const qty = cart[id] || 0;
        const card = document.querySelector(`.food-card[data-id="${id}"]`);
        if (!card) return;

        const qtyEl = card.querySelector(`[data-qty-id="${id}"]`);
        const minusBtn = card.querySelector('.food-minus');

        if (qtyEl) qtyEl.textContent = qty;
        if (minusBtn) minusBtn.style.visibility = qty > 0 ? 'visible' : 'hidden';
        card.classList.toggle('in-cart', qty > 0);
    }

    function updateCartBar() {
        const bar = $('cart-bar');
        if (!bar) return;

        const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
        const totalPrice = calcFoodTotal();

        if (totalItems > 0) {
            bar.classList.add('visible');
            $('cart-count-text').textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
            $('cart-total-text').textContent = `${totalPrice} EGP`;
        } else {
            bar.classList.remove('visible');
        }
    }

    function calcFoodTotal() {
        let total = 0;
        Object.entries(cart).forEach(([id, qty]) => {
            const item = FOOD_MENU.find(f => f.id === id);
            if (item) total += item.price * qty;
        });
        return total;
    }

    /* =========================================================
       STEP NAVIGATION
       ========================================================= */
    function goToStep(step) {
        currentStep = step;
        renderStep(step);
    }

    function renderStep(step) {
        // Update step indicators
        document.querySelectorAll('.step-item').forEach((el, i) => {
            const n = i + 1;
            el.classList.remove('active', 'done');
            if (n < step) el.classList.add('done');
            if (n === step) el.classList.add('active');
        });

        document.querySelectorAll('.step-line').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i < step - 1) el.classList.add('done');
            if (i === step - 1) el.classList.add('active');
        });

        // Show active view
        document.querySelectorAll('.step-view').forEach(v => v.classList.remove('active'));
        $(`step-${step}`)?.classList.add('active');

        // Step-specific rendering
        if (step === 2) renderOrderSummary();
        if (step === 3) renderConfirmation();

        // Hide/show cart bar
        const bar = $('cart-bar');
        if (bar) bar.classList.toggle('visible', step === 1 && Object.keys(cart).length > 0);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* =========================================================
       ORDER SUMMARY (Step 2)
       ========================================================= */
    function renderOrderSummary() {
        const el = $('order-summary-body');
        if (!el || !booking) return;

        const seatCount = booking.seats ? booking.seats.length : 0;
        const ticketTotal = booking.total || 0;
        const foodTotal = calcFoodTotal();
        const grandTotal = ticketTotal + foodTotal;
        const currency = booking.currency || 'EGP';

        let html = `
            <div class="order-line"><span class="label">Movie</span><span class="value">${booking.movie?.title || '—'}</span></div>
            <div class="order-line"><span class="label">Date</span><span class="value">${booking.date || '—'}</span></div>
            <div class="order-line"><span class="label">Showtime</span><span class="value">${booking.showtime?.time || '—'} · ${booking.experience || ''}</span></div>
            <div class="order-line"><span class="label">Seats (${seatCount})</span><span class="value">${booking.seats?.join(', ') || '—'}</span></div>
            <div class="order-line"><span class="label">Tickets</span><span class="value">${ticketTotal.toLocaleString()} ${currency}</span></div>`;

        if (foodTotal > 0) {
            html += `<div class="order-line"><span class="label">Food & Drinks</span><span class="value">${foodTotal} ${currency}</span></div>`;
            // Individual items
            Object.entries(cart).forEach(([id, qty]) => {
                const item = FOOD_MENU.find(f => f.id === id);
                if (item && qty > 0) {
                    html += `<div class="order-line" style="padding-left:16px;font-size:13px;"><span class="label" style="color:var(--text-muted);">${item.emoji} ${item.name} ×${qty}</span><span class="value" style="font-size:13px;">${(item.price * qty)} ${currency}</span></div>`;
                }
            });
        }

        html += `<div class="order-line total"><span class="label">Total</span><span class="value">${grandTotal.toLocaleString()} ${currency}</span></div>`;

        el.innerHTML = html;

        // Generate Fawry ref number
        const fawryRef = $('fawry-ref');
        if (fawryRef) fawryRef.textContent = generateFawryRef();
    }

    /* =========================================================
       PROCESS PAYMENT
       ========================================================= */
    function processPayment() {
        const btn = $('btn-pay-now');

        if (paymentMethod === 'card') {
            // Validate card fields
            const cardNum = $('card-number')?.value.replace(/\s/g, '');
            const expiry = $('card-expiry')?.value;
            const cvv = $('card-cvv')?.value;
            const holder = $('card-holder')?.value;

            if (!cardNum || cardNum.length < 13) { alert('Please enter a valid card number.'); return; }
            if (!expiry || !expiry.match(/^\d{2}\/\d{2}$/)) { alert('Please enter expiry as MM/YY.'); return; }
            if (!cvv || cvv.length < 3) { alert('Please enter a valid CVV.'); return; }
            if (!holder || holder.length < 2) { alert('Please enter the cardholder name.'); return; }
        }

        // Simulate payment processing
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
        }

        setTimeout(() => {
            bookingNumber = generateBookingNumber();
            saveBooking();
            goToStep(3);
        }, 2000);
    }

    /* =========================================================
       CONFIRMATION (Step 3)
       ========================================================= */
    function renderConfirmation() {
        const el = $('confirm-body');
        if (!el || !booking) return;

        const foodTotal = calcFoodTotal();
        const grandTotal = (booking.total || 0) + foodTotal;
        const currency = booking.currency || 'EGP';

        let foodHtml = '';
        if (Object.keys(cart).length > 0) {
            foodHtml = '<div class="confirm-detail-row"><span class="dl">Food & Drinks</span><span class="dv">';
            Object.entries(cart).forEach(([id, qty]) => {
                const item = FOOD_MENU.find(f => f.id === id);
                if (item && qty > 0) foodHtml += `${item.emoji} ${item.name} ×${qty}<br>`;
            });
            foodHtml += '</span></div>';
        }

        el.innerHTML = `
            <div class="booking-number-box">
                <div class="booking-number-label">Booking Number</div>
                <div class="booking-number">${bookingNumber}</div>
            </div>
            <div class="confirm-details">
                <div class="confirm-detail-row"><span class="dl">Movie</span><span class="dv">${booking.movie?.title || '—'}</span></div>
                <div class="confirm-detail-row"><span class="dl">Date</span><span class="dv">${booking.date || '—'}</span></div>
                <div class="confirm-detail-row"><span class="dl">Showtime</span><span class="dv">${booking.showtime?.time || '—'} · ${booking.experience || ''}</span></div>
                <div class="confirm-detail-row"><span class="dl">Hall</span><span class="dv">${booking.showtime?.hall || '—'}</span></div>
                <div class="confirm-detail-row"><span class="dl">Seats</span><span class="dv">${booking.seats?.join(', ') || '—'}</span></div>
                <div class="confirm-detail-row"><span class="dl">Payment</span><span class="dv">${paymentMethod === 'card' ? 'Visa / Credit Card' : 'Fawry'}</span></div>
                ${foodHtml}
                <div class="confirm-detail-row" style="border-top:2px solid var(--primary);padding-top:12px;margin-top:8px;">
                    <span class="dl" style="font-weight:700;color:var(--text-primary);">Total Paid</span>
                    <span class="dv" style="font-size:20px;color:var(--primary-light);font-weight:700;">${grandTotal.toLocaleString()} ${currency}</span>
                </div>
            </div>`;
    }

    /* =========================================================
       SAVE BOOKING
       ========================================================= */
    function saveBooking() {
        try {
            const bookings = JSON.parse(localStorage.getItem('scene_bookings') || '[]');
            bookings.push({
                bookingNumber,
                movie: booking.movie?.title,
                date: booking.date,
                showtime: booking.showtime?.time,
                experience: booking.experience,
                hall: booking.showtime?.hall,
                seats: booking.seats,
                ticketTotal: booking.total,
                foodTotal: calcFoodTotal(),
                foodItems: { ...cart },
                paymentMethod,
                currency: booking.currency,
                createdAt: new Date().toISOString(),
            });
            localStorage.setItem('scene_bookings', JSON.stringify(bookings));
        } catch (_) {}

        // Clear session
        sessionStorage.removeItem('bookingSummary');
        sessionStorage.removeItem('cinema_bk_v3');
    }

    /* =========================================================
       HELPERS
       ========================================================= */
    function generateBookingNumber() {
        const prefix = 'SCN';
        const ts = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${ts}-${rand}`;
    }

    function generateFawryRef() {
        return Math.floor(100000000000 + Math.random() * 900000000000).toString();
    }

})();
