/**
 * payment.js — 3-step payment flow
 * Step 1: Food & Drinks add-on
 * Step 2: Payment method (Visa / Fawry)
 * Step 3: Booking confirmation + QR ticket cards (backend-generated)
 *
 * QR TICKET INTEGRATION:
 * After payment is confirmed, the frontend sends booking data to
 * POST /api/tickets/generate on the Express backend. The backend
 * generates one unique QR code per seat and returns them as base64
 * data URLs. Tickets are rendered as premium cards in Step 3.
 *
 * QR ticket generation can fail gracefully, but booking confirmation must use
 * the MongoDB booking created during seat selection.
 */
(function () {
    'use strict';

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    /**
     * Backend API base URL.
     * FUTURE: Read from environment config or window.__CONFIG__
     */
    const BACKEND_URL = 'http://localhost:5000';

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

    /**
     * Stores the backend ticket response after successful generation.
     * Shape: { bookingId, purchaseTimestamp, tickets: [ { ticketId, seatNumber, qrCodeDataUrl, ... } ] }
     * Null if ticket generation hasn't happened or failed.
     */
    let generatedTicketData = null;

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

        if (!booking.backendBookingId) {
            document.querySelector('.payment-page').innerHTML = `
                <div style="text-align:center;padding:100px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--primary-light);margin-bottom:20px;"></i>
                    <h2 style="font-family:var(--font-display);letter-spacing:2px;margin-bottom:10px;">BOOKING NOT SAVED</h2>
                    <p style="color:var(--text-muted);margin-bottom:20px;">Please return to seat selection and create a database-backed booking first.</p>
                    <a href="booking.html" class="pay-btn pay-btn-primary">SELECT SEATS</a>
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

        // Download all tickets
        $('btn-download-all')?.addEventListener('click', downloadAllTickets);
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

        // After simulated payment delay, generate QR tickets via backend
        setTimeout(async () => {
            bookingNumber = generateBookingNumber();

            // Attempt to generate QR tickets from backend
            await generateTicketsFromBackend();

            const confirmed = await confirmBackendBooking();
            if (!confirmed) {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-lock"></i> PAY NOW';
                }
                alert('Payment could not confirm the booking in the database. Please try again.');
                return;
            }

            // Cache the confirmed booking and tickets for local viewing.
            saveBookingCache();

            // Navigate to confirmation step
            goToStep(3);
        }, 2000);
    }

    /* =========================================================
       BACKEND QR TICKET GENERATION
       =========================================================
       Sends booking data to the Express backend which generates
       unique QR codes per seat using the `qrcode` npm package.
       
       On failure, sets generatedTicketData to null — the
       confirmation page still renders without QR codes (fallback).
       ========================================================= */

    /**
     * Call the backend ticket generation endpoint.
     * Stores response in `generatedTicketData` on success.
     * Gracefully handles errors without breaking the booking flow.
     */
    async function generateTicketsFromBackend() {
        try {
            const seatCount = booking.seats ? booking.seats.length : 0;
            const pricePerSeat = seatCount > 0 ? (booking.total || 0) / seatCount : 0;

            const payload = {
                movieTitle: booking.movie?.title || 'Unknown Movie',
                seats: booking.seats || [],
                date: booking.date || '',
                time: booking.showtime?.time || '',
                experience: booking.experience || 'Standard',
                hall: booking.showtime?.hall || 'Main Hall',
                pricePerSeat: pricePerSeat,
                currency: booking.currency || 'EGP',
            };

            const response = await fetch(`${BACKEND_URL}/api/tickets/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn('[Payment] Ticket generation failed:', response.status, errorData);
                generatedTicketData = null;
                return;
            }

            generatedTicketData = await response.json();

            // Use backend-provided booking ID if available
            if (generatedTicketData.bookingId) {
                bookingNumber = generatedTicketData.bookingId;
            }

            console.info('[Payment] Tickets generated successfully:', generatedTicketData.tickets?.length, 'tickets');

        } catch (error) {
            // Network error, backend offline, etc.
            console.warn('[Payment] Backend ticket generation unavailable:', error.message);
            generatedTicketData = null;
        }
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
                <div style="margin-top: 20px; text-align: center;">
                    <a href="${generateGoogleCalendarUrl(booking)}" target="_blank" class="pay-btn pay-btn-outline" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: auto; padding: 12px 24px; text-decoration: none;">
                        <i class="far fa-calendar-alt"></i> Add to Google Calendar
                    </a>
                </div>
            </div>`;

        // Render QR ticket cards (if backend generated them)
        renderTicketCards();
    }

    /* =========================================================
       QR TICKET CARD RENDERING
       =========================================================
       Renders premium-styled ticket cards into #tickets-container.
       Each card displays: QR code, movie title, seat, IDs,
       date, time, experience, hall, price, and purchase time.
       
       Matches the dark cinema aesthetic with red accent borders,
       glass-morphism backgrounds, and cinema tear-line dividers.
       ========================================================= */

    /**
     * Render individual QR ticket cards for each booked seat.
     * Called by renderConfirmation() after the existing confirmation
     * details have been rendered. Shows fallback message if no
     * QR data is available.
     */
    function renderTicketCards() {
        const container = $('tickets-container');
        if (!container) return;

        // No ticket data — show fallback (backend was unreachable)
        if (!generatedTicketData || !generatedTicketData.tickets || generatedTicketData.tickets.length === 0) {
            container.innerHTML = `
                <div class="tickets-fallback">
                    <i class="fas fa-info-circle"></i>
                    <p>QR tickets are currently unavailable. Your booking is confirmed — please present your booking number at the counter.</p>
                </div>`;
            // Hide download-all button
            const dlBtn = $('btn-download-all');
            if (dlBtn) dlBtn.style.display = 'none';
            return;
        }

        const { bookingId, purchaseTimestamp, tickets } = generatedTicketData;
        const purchaseDate = new Date(purchaseTimestamp);
        const purchaseDisplay = purchaseDate.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        let html = `
            <div class="tickets-section">
                <div class="tickets-section-title">
                    <i class="fas fa-ticket-alt"></i>
                    Your Tickets (${tickets.length})
                </div>
                <div class="tickets-grid">`;

        tickets.forEach((ticket, index) => {
            html += `
                    <div class="ticket-card" data-ticket-index="${index}">
                        <!-- Ticket Header -->
                        <div class="ticket-header">
                            <div class="ticket-cinema">
                                <span class="ticket-cinema-name">THE HALL</span>
                                <span class="ticket-cinema-sub">CINEMAS</span>
                            </div>
                            <span class="ticket-experience-badge">${ticket.experience}</span>
                        </div>

                        <!-- QR Code -->
                        <div class="ticket-qr">
                            <img src="${ticket.qrCodeDataUrl}"
                                 alt="QR Code for seat ${ticket.seatNumber}"
                                 class="ticket-qr-img"
                                 id="qr-img-${index}" />
                            <div class="ticket-qr-label">Scan at entrance</div>
                        </div>

                        <!-- Ticket Divider (cinema tear-line) -->
                        <div class="ticket-divider"></div>

                        <!-- Ticket Details -->
                        <div class="ticket-details">
                            <div class="ticket-movie-title">${ticket.movieTitle}</div>
                            <div class="ticket-info-grid">
                                <div class="ticket-info-item">
                                    <span class="ticket-info-label">SEAT</span>
                                    <span class="ticket-info-value ticket-seat-highlight">${ticket.seatNumber}</span>
                                </div>
                                <div class="ticket-info-item">
                                    <span class="ticket-info-label">HALL</span>
                                    <span class="ticket-info-value">${ticket.hall}</span>
                                </div>
                                <div class="ticket-info-item">
                                    <span class="ticket-info-label">DATE</span>
                                    <span class="ticket-info-value">${ticket.date}</span>
                                </div>
                                <div class="ticket-info-item">
                                    <span class="ticket-info-label">TIME</span>
                                    <span class="ticket-info-value">${ticket.time}</span>
                                </div>
                                <div class="ticket-info-item">
                                    <span class="ticket-info-label">PRICE</span>
                                    <span class="ticket-info-value">${ticket.pricePerSeat?.toLocaleString() || '—'} ${ticket.currency || 'EGP'}</span>
                                </div>
                                <div class="ticket-info-item">
                                    <span class="ticket-info-label">PURCHASED</span>
                                    <span class="ticket-info-value">${purchaseDisplay}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Ticket IDs -->
                        <div class="ticket-ids">
                            <span class="ticket-id-badge booking-id">${bookingId}</span>
                            <span class="ticket-id-badge ticket-id">${ticket.ticketId}</span>
                        </div>

                        <!-- Per-ticket Download Button -->
                        <div class="ticket-footer">
                            <button class="ticket-download-btn"
                                    onclick="window.__downloadTicket(${index})"
                                    id="btn-download-ticket-${index}">
                                <i class="fas fa-download"></i> Download Ticket
                            </button>
                        </div>
                    </div>`;
        });

        html += `
                </div>
            </div>`;

        container.innerHTML = html;

        // Show Download All button
        const dlBtn = $('btn-download-all');
        if (dlBtn) dlBtn.style.display = '';
    }

    /* =========================================================
       TICKET DOWNLOAD — Individual & Bulk
       =========================================================
       Creates a canvas with the ticket QR code and info,
       then triggers a PNG file download for the user.
       ========================================================= */

    /**
     * Download a single ticket as a PNG image.
     * Draws a styled canvas with ticket info and QR code.
     * @param {number} index — Index of the ticket in generatedTicketData.tickets
     */
    function downloadTicket(index) {
        if (!generatedTicketData || !generatedTicketData.tickets[index]) return;

        const ticket = generatedTicketData.tickets[index];
        const { bookingId } = generatedTicketData;

        // Create an off-screen canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 500;
        const height = 700;
        canvas.width = width;
        canvas.height = height;

        // Dark cinema background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Red accent top border
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#b71c1c');
        gradient.addColorStop(1, '#e53935');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, 5);

        // Cinema name
        ctx.fillStyle = '#e53935';
        ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('THE HALL CINEMASS', width / 2, 50);

        // Experience badge
        ctx.fillStyle = 'rgba(183, 28, 28, 0.3)';
        const badgeText = ticket.experience;
        const badgeWidth = ctx.measureText(badgeText).width + 30;
        ctx.fillRect((width - badgeWidth) / 2, 60, badgeWidth, 28);
        ctx.fillStyle = '#ef9a9a';
        ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
        ctx.fillText(badgeText, width / 2, 79);

        // Load QR image and draw
        const qrImg = new Image();
        qrImg.onload = function () {
            // QR white background
            const qrSize = 200;
            const qrX = (width - qrSize) / 2;
            const qrY = 105;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

            // Scan label
            ctx.fillStyle = '#757575';
            ctx.font = '11px "Segoe UI", Arial, sans-serif';
            ctx.fillText('Scan at entrance', width / 2, qrY + qrSize + 25);

            // Dashed divider
            const divY = qrY + qrSize + 45;
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = 'rgba(183, 28, 28, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(30, divY);
            ctx.lineTo(width - 30, divY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Movie title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.fillText(ticket.movieTitle, width / 2, divY + 35);

            // Info grid
            const infoY = divY + 60;
            const infoItems = [
                ['SEAT', ticket.seatNumber],
                ['HALL', ticket.hall],
                ['DATE', ticket.date],
                ['TIME', ticket.time],
                ['PRICE', `${ticket.pricePerSeat?.toLocaleString() || '—'} ${ticket.currency || 'EGP'}`],
            ];

            ctx.textAlign = 'left';
            infoItems.forEach((item, i) => {
                const x = i % 2 === 0 ? 50 : 280;
                const y = infoY + Math.floor(i / 2) * 45;

                ctx.fillStyle = '#9e9e9e';
                ctx.font = '600 10px "Segoe UI", Arial, sans-serif';
                ctx.fillText(item[0], x, y);

                ctx.fillStyle = '#ffffff';
                ctx.font = '500 15px "Segoe UI", Arial, sans-serif';
                ctx.fillText(item[1], x, y + 18);
            });

            // IDs at bottom
            const idsY = height - 60;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#9e9e9e';
            ctx.font = '600 10px "Segoe UI", Arial, sans-serif';
            ctx.fillText(bookingId, width / 2 - 90, idsY);
            ctx.fillText(ticket.ticketId, width / 2 + 90, idsY);

            // Bottom border
            ctx.fillStyle = gradient;
            ctx.fillRect(0, height - 5, width, 5);

            // Trigger download
            const link = document.createElement('a');
            link.download = `ticket_${ticket.ticketId}_${ticket.seatNumber}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        qrImg.src = ticket.qrCodeDataUrl;
    }

    /**
     * Download all tickets sequentially with a small delay
     * to avoid being blocked by the browser's download manager.
     */
    function downloadAllTickets() {
        if (!generatedTicketData || !generatedTicketData.tickets) return;

        generatedTicketData.tickets.forEach((_, index) => {
            setTimeout(() => downloadTicket(index), index * 500);
        });
    }

    // Expose download function to global scope for onclick handlers
    window.__downloadTicket = downloadTicket;

    /* =========================================================
       SAVE BOOKING
       =========================================================
       Confirms through the backend first, then caches ticket data locally.
       ========================================================= */
    async function confirmBackendBooking() {
        const backendBookingId = booking.backendBookingId;
        const token = localStorage.getItem('userToken');
        if (!backendBookingId || !token) return false;

        try {
            const res = await fetch(`${BACKEND_URL}/api/bookings/${backendBookingId}/confirm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (res.ok) {
                console.log('Backend booking confirmed:', backendBookingId);
                return true;
            }
            console.warn('Backend booking confirm failed:', res.status);
            return false;
        } catch (err) {
            console.warn('Backend confirm error:', err.message);
            return false;
        }
    }

    function saveBookingCache() {
        // Cache only; the backend booking was already confirmed.
        const backendBookingId = booking.backendBookingId;
        try {
            const bookings = JSON.parse(localStorage.getItem('thehall_bookings') || '[]');
            bookings.push({
                bookingNumber,
                backendBookingId: backendBookingId || null,
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
                // Include ticket data for offline reference
                tickets: generatedTicketData ? generatedTicketData.tickets.map(t => ({
                    ticketId: t.ticketId,
                    seatNumber: t.seatNumber,
                    qrCodeDataUrl: t.qrCodeDataUrl,
                })) : null,
            });
            localStorage.setItem('thehall_bookings', JSON.stringify(bookings));
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
        let ref = '';
        for (let i = 0; i < 10; i++) {
            ref += Math.floor(Math.random() * 10);
        }
        return ref;
    }

    function generateGoogleCalendarUrl(booking) {
        let startDate = new Date();
        const currentYear = new Date().getFullYear();
        const dateStr = booking.date || '';
        const timeStr = booking.showtime?.time || '';
        
        // Attempt parsing "Wednesday, May 27" and "19:00"
        const cleanDateStr = dateStr.includes(',') ? dateStr.split(',')[1].trim() : dateStr;
        const parsedDate = new Date(`${cleanDateStr} ${currentYear} ${timeStr}`);
        if (!isNaN(parsedDate.getTime())) {
            startDate = parsedDate;
        }

        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default to 2 hours duration

        const formatToUTC = (d) => {
            return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
        };

        const dates = `${formatToUTC(startDate)}/${formatToUTC(endDate)}`;
        const eventTitle = booking.movie?.title ? `Cinema: ${booking.movie.title}` : 'Cinema Booking';
        const location = 'Misr International University (MIU), KM 28 Cairo – Ismailia Road, Cairo Governorate, Egypt';
        const seats = booking.seats ? booking.seats.join(', ') : 'Unassigned';
        const details = `Booking Reference: ${bookingNumber}\nMovie: ${booking.movie?.title || 'Unknown'}\nSeats: ${seats}\nExperience: ${booking.experience || 'Standard'}`;

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${encodeURIComponent(dates)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    }

})();
