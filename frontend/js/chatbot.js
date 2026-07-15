/**
 * ============================================
 * THE HALL AI — Cinema Chatbot (Frontend)
 * Self-contained IIFE with singleton guard.
 * Context-aware, session-persistent, premium UI.
 *
 * Booking assistant flow:
 *   1. User says "book a ticket" → booking_start detected
 *   2. Frontend auto-fetches movies from /api/chatbot/booking
 *   3. User clicks a movie → fetch showtimes
 *   4. User clicks a showtime → fetch seat info
 *   5. "Continue Booking" → redirect to booking.html
 * ============================================
 */
(function () {
    'use strict';

    // ── Singleton guard ────────────────────────────────
    if (window.__sceneChatbotInit) return;
    window.__sceneChatbotInit = true;

    // ── Config ─────────────────────────────────────────
    const CFG = {
        API_URL: 'http://localhost:5000/api/chatbot',
        BOOKING_API_URL: 'http://localhost:5000/api/chatbot/booking',
        HISTORY_KEY: 'thehall_chatbot_history',
        BOOKING_STATE_KEY: 'thehall_chatbot_booking',
        MAX_HISTORY: 20,       // max messages in sessionStorage
        MAX_API_HISTORY: 10,   // max messages sent to backend
        TYPING_DELAY_MIN: 400,
        TYPING_DELAY_MAX: 900,
    };

    // ── State ──────────────────────────────────────────
    let isOpen = false;
    let isWaiting = false;
    let conversationHistory = [];
    let bookingState = null; // { step, selectedMovieId, selectedMovieTitle, ... }

    // ── DOM refs (populated on init) ───────────────────
    let DOM = {};

    // ── Quick action buttons (replaces old suggestions) ─
    const QUICK_ACTIONS = [
        { icon: 'fas fa-film',       label: 'Movies showing now',  action: 'movies' },
        { icon: 'fas fa-clock',      label: 'Showtimes',           action: 'showtimes' },
        { icon: 'fas fa-utensils',   label: 'Food & drinks',       action: 'food' },
        { icon: 'fas fa-headset',    label: 'Contact support',     action: 'support' },
    ];

    // Legacy fallback suggestions for non-booking responses
    const DEFAULT_SUGGESTIONS = [
        'Recommend me a movie',
        'Help me choose the best seats',
        'IMAX vs Dolby?',
        'How do I book a ticket?',
    ];

    // ============================================
    // CONTEXT COLLECTION
    // ============================================
    function collectContext() {
        const ctx = {
            currentPage: window.location.pathname.split('/').pop() || 'index.html',
            bookingContext: null,
            movieContext: null,
        };

        // Booking summary (set during checkout in booking.js)
        try {
            const bs = sessionStorage.getItem('bookingSummary');
            if (bs) {
                const parsed = JSON.parse(bs);
                ctx.bookingContext = {
                    movie: parsed.movie?.title || null,
                    experience: parsed.experience || null,
                    date: parsed.date || null,
                    showtime: parsed.showtime?.time || null,
                    seats: parsed.seats || [],
                    seatCount: parsed.seats?.length || 0,
                    total: parsed.total || null,
                    pricePerSeat: parsed.pricePerSeat || null,
                    currency: parsed.currency || 'EGP',
                };
            }
        } catch (_) { /* safe */ }

        // Active booking state (from booking page IIFE)
        try {
            const bk = sessionStorage.getItem('cinema_bk_v3');
            if (bk && !ctx.bookingContext) {
                const parsed = JSON.parse(bk);
                ctx.bookingContext = {
                    experience: parsed.stType || null,
                    seats: parsed.selected || [],
                    seatCount: (parsed.selected || []).length,
                };
            }
        } catch (_) { /* safe */ }

        // Selected movie (set when user clicks a movie card)
        try {
            const sm = sessionStorage.getItem('selectedMovie');
            if (sm) {
                const parsed = JSON.parse(sm);
                ctx.movieContext = {
                    tmdb_id: parsed.tmdb_id || parsed.id || null,
                    id: parsed.id || null,
                    title: parsed.title || null,
                    genre: parsed.genre || null,
                    rating: parsed.rating || null,
                    duration: parsed.duration || null,
                };
            }
        } catch (_) { /* safe */ }

        if (ctx.currentPage === 'movie-detail.html') {
            const tmdbId = new URLSearchParams(window.location.search).get('id');
            if (tmdbId) {
                ctx.movieContext = {
                    ...(ctx.movieContext || {}),
                    tmdb_id: tmdbId,
                    id: tmdbId,
                };
            }
        }

        return ctx;
    }

    // ============================================
    // CONVERSATION HISTORY (sessionStorage)
    // ============================================
    function loadHistory() {
        try {
            const data = sessionStorage.getItem(CFG.HISTORY_KEY);
            if (data) {
                conversationHistory = JSON.parse(data);
                if (!Array.isArray(conversationHistory)) conversationHistory = [];
            }
        } catch (_) {
            conversationHistory = [];
        }
    }

    function saveHistory() {
        try {
            const toSave = conversationHistory.slice(-CFG.MAX_HISTORY);
            sessionStorage.setItem(CFG.HISTORY_KEY, JSON.stringify(toSave));
        } catch (_) { /* quota exceeded — ignore */ }
    }

    function addToHistory(role, content) {
        conversationHistory.push({ role, content });
        saveHistory();
    }

    // ============================================
    // BOOKING STATE (sessionStorage)
    // ============================================
    function loadBookingState() {
        try {
            const data = sessionStorage.getItem(CFG.BOOKING_STATE_KEY);
            if (data) bookingState = JSON.parse(data);
        } catch (_) {
            bookingState = null;
        }
    }

    function saveBookingState() {
        try {
            if (bookingState) {
                sessionStorage.setItem(CFG.BOOKING_STATE_KEY, JSON.stringify(bookingState));
            } else {
                sessionStorage.removeItem(CFG.BOOKING_STATE_KEY);
            }
        } catch (_) { /* safe */ }
    }

    function resetBookingState() {
        bookingState = null;
        saveBookingState();
    }

    function startBookingFlow() {
        bookingState = {
            step: 'choose_movie',
            selectedMovieId: null,
            selectedMovieTitle: null,
            selectedExperience: null,
            selectedDate: null,
            selectedDateLabel: null,
            selectedShowId: null,
            selectedShowTime: null,
            selectedShowTheater: null,
        };
        saveBookingState();
    }

    // ============================================
    // AUTH CHECK
    // ============================================
    function isLoggedIn() {
        const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || localStorage.getItem('thehall_user');
        const flag = localStorage.getItem('isUserLoggedIn');
        return !!(token && userData) || flag === 'true';
    }

    // ============================================
    // BUILD DOM
    // ============================================
    function buildUI() {
        // Toggle button
        const toggle = document.createElement('button');
        toggle.className = 'chatbot-toggle';
        toggle.id = 'chatbot-toggle';
        toggle.setAttribute('aria-label', 'Open cinema assistant');
        toggle.innerHTML = `
            <span class="chatbot-icon-open"><i class="fas fa-robot"></i></span>
            <span class="chatbot-icon-close"><i class="fas fa-times"></i></span>
        `;

        // Chat window
        const win = document.createElement('div');
        win.className = 'chatbot-window';
        win.id = 'chatbot-window';
        win.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-icon"><i class="fas fa-film"></i></div>
                <div class="chatbot-header-info">
                    <div class="chatbot-header-title">THE HALL AI Assistant</div>
                    <div class="chatbot-header-status">
                        <span class="chatbot-status-dot"></span>
                        <span>Online • Powered by AI</span>
                    </div>
                </div>
                <div class="chatbot-header-actions">
                    <button class="chatbot-header-btn" id="chatbot-minimize" aria-label="Minimize chat">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="chatbot-header-btn" id="chatbot-close" aria-label="Close chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="chatbot-messages" id="chatbot-messages"></div>
            <div class="chatbot-suggestions" id="chatbot-suggestions"></div>
            <div class="chatbot-input-area" style="display:none">
                <input type="text" class="chatbot-input" id="chatbot-input"
                       placeholder="Ask me anything about cinema..."
                       autocomplete="off" maxlength="500">
                <button class="chatbot-send-btn" id="chatbot-send" aria-label="Send message">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toggle);
        document.body.appendChild(win);

        // Cache DOM refs
        DOM.toggle = toggle;
        DOM.window = win;
        DOM.messages = win.querySelector('#chatbot-messages');
        DOM.suggestions = win.querySelector('#chatbot-suggestions');
        DOM.input = win.querySelector('#chatbot-input');
        DOM.sendBtn = win.querySelector('#chatbot-send');
        DOM.minimize = win.querySelector('#chatbot-minimize');
        DOM.close = win.querySelector('#chatbot-close');

        // Detect bottom bar on booking page
        if (document.querySelector('.bottom-bar, .cart-bar')) {
            document.body.classList.add('has-bottom-bar');
        }
    }

    // ============================================
    // RENDER FUNCTIONS
    // ============================================
    function renderWelcome() {
        const welcome = document.createElement('div');
        welcome.className = 'chatbot-welcome';
        welcome.innerHTML = `
            <span class="chatbot-welcome-icon">🎬</span>
            <div class="chatbot-welcome-title">Welcome to THE HALL AI</div>
            <div class="chatbot-welcome-subtitle">Your personal cinema assistant. I can help you book tickets, find movies, choose seats, and more!</div>
        `;
        DOM.messages.appendChild(welcome);
    }

    /** Render quick action buttons (the new default view) */
    function renderQuickActions() {
        DOM.suggestions.innerHTML = QUICK_ACTIONS.map(a =>
            `<button class="chatbot-action-btn" data-action="${a.action}">
                <i class="${a.icon}"></i>
                <span>${a.label}</span>
            </button>`
        ).join('');
    }

    /** Render text suggestion chips (for follow-up suggestions) */
    function renderSuggestions(suggestions) {
        const items = suggestions || DEFAULT_SUGGESTIONS;
        DOM.suggestions.innerHTML = items.map(s =>
            `<button class="chatbot-suggestion-chip">${escapeHTML(s)}</button>`
        ).join('');
    }

    function addMessage(role, text, source) {
        const msgEl = document.createElement('div');
        msgEl.className = `chatbot-msg ${role}`;

        const formatted = formatMessage(text);

        if (role === 'ai') {
            msgEl.innerHTML = `
                <div class="chatbot-msg-avatar"><i class="fas fa-film"></i></div>
                <div>
                    <div class="chatbot-msg-bubble">${formatted}</div>
                    ${source ? `<div class="chatbot-msg-source">${source === 'openai' ? '✨ AI Powered' : '🎯 THE HALL Assistant'}</div>` : ''}
                </div>
            `;
        } else {
            msgEl.innerHTML = `
                <div class="chatbot-msg-bubble">${formatted}</div>
            `;
        }

        DOM.messages.appendChild(msgEl);
        scrollToBottom();
    }

    /** Add an AI message with action buttons below it */
    function addMessageWithButtons(text, buttons, source) {
        const msgEl = document.createElement('div');
        msgEl.className = 'chatbot-msg ai';

        const formatted = formatMessage(text);

        let buttonsHtml = '';
        if (buttons && buttons.length > 0) {
            const btnType = buttons[0].type;

            if (btnType === 'movie_option') {
                buttonsHtml = `<div class="chatbot-movie-options">
                    ${buttons.map(b => `
                        <button class="chatbot-movie-btn" data-movie-id="${b.movieId}">
                            ${b.posterUrl
                                ? `<img class="chatbot-movie-poster" src="${escapeHTML(b.posterUrl)}" alt="${escapeHTML(b.label)}" onerror="this.style.display='none'">`
                                : `<div class="chatbot-movie-poster chatbot-movie-poster--placeholder"><i class="fas fa-film"></i></div>`
                            }
                            <div class="chatbot-movie-info">
                                <div class="chatbot-movie-title">${escapeHTML(b.label)}</div>
                                ${b.genre ? `<div class="chatbot-movie-meta">${escapeHTML(b.genre)}${b.duration ? ` • ${b.duration}min` : ''}</div>` : ''}
                            </div>
                            <i class="fas fa-chevron-right chatbot-movie-arrow"></i>
                        </button>
                    `).join('')}
                </div>`;
            } else if (btnType === 'experience_option') {
                buttonsHtml = `<div class="chatbot-showtime-options">
                    ${buttons.map(b => `
                        <button class="chatbot-experience-btn" data-experience="${escapeHTML(b.experience)}">
                            <div class="chatbot-showtime-time">${escapeHTML(b.label)}</div>
                        </button>
                    `).join('')}
                </div>`;
            } else if (btnType === 'date_option') {
                buttonsHtml = `<div class="chatbot-showtime-options">
                    ${buttons.map(b => `
                        <button class="chatbot-date-btn" data-date="${escapeHTML(b.date)}">
                            <div class="chatbot-showtime-time">${escapeHTML(b.label)}</div>
                        </button>
                    `).join('')}
                </div>`;
            } else if (btnType === 'show_option') {
                buttonsHtml = `<div class="chatbot-showtime-options">
                    ${buttons.map(b => `
                        <button class="chatbot-showtime-btn${b.soldOut ? ' chatbot-showtime-btn--disabled' : ''}"
                                data-show-id="${b.showId}"
                                data-movie-id="${b.movieId}"
                                data-local-movie-id="${escapeHTML(b.localMovieId || '')}"
                                data-movie-title="${escapeHTML(b.movieTitle || '')}"
                                data-theater-name="${escapeHTML(b.theaterName || '')}"
                                ${b.soldOut ? 'disabled' : ''}>
                            <div class="chatbot-showtime-time">${escapeHTML(b.label)}</div>
                            <div class="chatbot-showtime-date">${escapeHTML(b.sublabel)}${b.price ? ` • ${b.price} EGP` : ''}${typeof b.availableSeats === 'number' ? ` • ${b.availableSeats} seats` : ''}</div>
                        </button>
                    `).join('')}
                </div>`;
            } else if (btnType === 'continue_booking') {
                const b = buttons[0];
                buttonsHtml = `<div class="chatbot-cta-wrap">
                    <button class="chatbot-cta-btn" 
                            data-movie-id="${b.movieId}" 
                            data-local-movie-id="${escapeHTML(b.localMovieId || '')}"
                            data-show-id="${b.showId}"
                            data-movie-title="${escapeHTML(b.movieTitle || '')}"
                            data-movie-duration="${escapeHTML(b.movieDuration || '')}"
                            data-theater-name="${escapeHTML(b.theaterName || '')}"
                            data-show-time="${escapeHTML(b.showTime || '')}"
                            data-show-date="${escapeHTML(b.showDate || '')}">
                        <i class="fas fa-ticket-alt"></i>
                        <span>Continue Booking</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>`;
            }
        }

        msgEl.innerHTML = `
            <div class="chatbot-msg-avatar"><i class="fas fa-film"></i></div>
            <div>
                <div class="chatbot-msg-bubble">${formatted}</div>
                ${buttonsHtml}
                ${source ? `<div class="chatbot-msg-source">🎯 THE HALL Assistant</div>` : ''}
            </div>
        `;

        DOM.messages.appendChild(msgEl);
        scrollToBottom();
    }

    function addErrorMessage(text) {
        const el = document.createElement('div');
        el.className = 'chatbot-error-msg';
        el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escapeHTML(text)}`;
        DOM.messages.appendChild(el);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const el = document.createElement('div');
        el.className = 'chatbot-typing';
        el.id = 'chatbot-typing';
        el.innerHTML = `
            <div class="chatbot-msg-avatar"><i class="fas fa-film"></i></div>
            <div class="chatbot-typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        DOM.messages.appendChild(el);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const el = document.getElementById('chatbot-typing');
        if (el) el.remove();
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            DOM.messages.scrollTop = DOM.messages.scrollHeight;
        });
    }

    // ============================================
    // MESSAGE FORMATTING
    // ============================================
    function formatMessage(text) {
        if (!text) return '';
        let html = escapeHTML(text);

        // Bold: **text**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Bullet points: lines starting with • or -
        html = html.replace(/^[•\-]\s*(.+)$/gm, '<br>• $1');

        // Numbered lists: 1. or 1️⃣ etc
        html = html.replace(/^(\d+[\.\)️⃣])\s*(.+)$/gm, '<br>$1 $2');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        // Clean up double <br>
        html = html.replace(/(<br>){3,}/g, '<br><br>');

        // Remove leading <br>
        html = html.replace(/^(<br>)+/, '');

        return html;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ============================================
    // BOOKING FLOW API
    // ============================================
    async function bookingAction(action, params = {}) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(CFG.BOOKING_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...params }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.warn('Booking API error:', err.message);
            return null;
        }
    }

    /** Handle "Movies showing now" — browse-only mode (no booking, no login required) */
    async function handleBrowseMovies() {
        showTypingIndicator();

        try {
            const res = await fetch('http://localhost:5000/api/movies');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const movies = await res.json();
            const nowShowing = movies.filter(m => m.status === 'now_showing');

            await sleep(400);
            hideTypingIndicator();

            if (!nowShowing.length) {
                addMessage('ai', "No movies are currently showing. Please check back later! 🎬", null);
                renderQuickActions();
                return;
            }

            // Build browse-only movie buttons HTML manually (with data-browse-only="true")
            const msgEl = document.createElement('div');
            msgEl.className = 'chatbot-msg ai';

            const movieList = nowShowing.map((m, i) => `${i + 1}. **${m.title}**${m.genre ? ` (${m.genre})` : ''}`).join('\n');
            const formatted = formatMessage(`Here are all movies currently showing — tap a movie for details:\n\n${movieList}`);

            const buttonsHtml = `<div class="chatbot-movie-options">
                ${nowShowing.map(m => `
                    <button class="chatbot-movie-btn" data-movie-id="${m.tmdb_id || m._id}" data-browse-only="true">
                        ${m.poster_url
                            ? `<img class="chatbot-movie-poster" src="${escapeHTML(m.poster_url)}" alt="${escapeHTML(m.title)}" onerror="this.style.display='none'">`
                            : `<div class="chatbot-movie-poster chatbot-movie-poster--placeholder"><i class="fas fa-film"></i></div>`
                        }
                        <div class="chatbot-movie-info">
                            <div class="chatbot-movie-title">${escapeHTML(m.title)}</div>
                            ${m.genre ? `<div class="chatbot-movie-meta">${escapeHTML(m.genre)}${m.duration ? ` • ${m.duration}min` : ''}</div>` : ''}
                        </div>
                        <i class="fas fa-chevron-right chatbot-movie-arrow"></i>
                    </button>
                `).join('')}
            </div>`;

            msgEl.innerHTML = `
                <div class="chatbot-msg-avatar"><i class="fas fa-film"></i></div>
                <div>
                    <div class="chatbot-msg-bubble">${formatted}</div>
                    ${buttonsHtml}
                    <div class="chatbot-msg-source">🎯 THE HALL Assistant</div>
                </div>
            `;

            DOM.messages.appendChild(msgEl);
            scrollToBottom();
            addToHistory('assistant', `Showing ${nowShowing.length} movies`);
            renderQuickActions();

        } catch (err) {
            hideTypingIndicator();
            addErrorMessage('Failed to load movies. Please try again.');
            renderQuickActions();
        }
    }

    /** Handle the booking flow — fetch movies */
    async function handleBookMovies() {
        // Auth check first
        if (!isLoggedIn()) {
            const currentPage = encodeURIComponent(window.location.pathname + window.location.search);
            addMessageWithButtons(
                '🔒 You need to log in first before booking tickets!',
                [{
                    type: 'continue_booking',
                    label: 'Log In',
                    movieId: '',
                    showId: '',
                    movieTitle: '',
                }],
                null
            );
            // Override the button to be a login link
            const lastMsg = DOM.messages.lastElementChild;
            const ctaWrap = lastMsg?.querySelector('.chatbot-cta-wrap');
            if (ctaWrap) {
                ctaWrap.innerHTML = `
                    <a href="login.html?redirect=${currentPage}" class="chatbot-cta-btn chatbot-cta-btn--login">
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Log In to Book</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                `;
            }
            resetBookingState();
            renderQuickActions();
            return;
        }

        startBookingFlow();
        showTypingIndicator();

        const result = await bookingAction('get_movies');
        await sleep(400);
        hideTypingIndicator();

        if (!result || !result.buttons || result.buttons.length === 0) {
            addMessage('ai', result?.reply || "I don't see any movies showing right now. Please check back later! 🎬", null);
            resetBookingState();
            renderQuickActions();
            return;
        }

        addMessageWithButtons(result.reply, result.buttons, 'fallback');
        addToHistory('assistant', result.reply);

        // Hide suggestions during booking flow
        DOM.suggestions.innerHTML = `
            <button class="chatbot-suggestion-chip chatbot-cancel-booking">
                <i class="fas fa-times"></i> Cancel booking
            </button>
        `;
    }

    /** Handle movie selection → fetch experiences (Step 2) */
    async function handleMovieSelected(movieId) {
        if (!bookingState) startBookingFlow();

        // Find movie title from last message buttons
        const movieBtn = DOM.messages.querySelector(`[data-movie-id="${movieId}"]`);
        const movieTitle = movieBtn?.querySelector('.chatbot-movie-title')?.textContent || 'this movie';

        bookingState.selectedMovieId = movieId;
        bookingState.selectedMovieTitle = movieTitle;
        bookingState.step = 'choose_experience';
        saveBookingState();

        // Show user's choice
        addMessage('user', `🎬 ${movieTitle}`);
        addToHistory('user', movieTitle);

        showTypingIndicator();
        const result = await bookingAction('get_experiences', { movieId });
        await sleep(400);
        hideTypingIndicator();

        if (!result || !result.buttons || result.buttons.length === 0) {
            addMessage('ai', result?.reply || "No experiences available for that movie right now. 🕐", null);
            addToHistory('assistant', result?.reply || 'No experiences available');
            bookingState.step = 'choose_movie';
            saveBookingState();
            showBookingBackButtons('movies');
            return;
        }

        addMessageWithButtons(result.reply, result.buttons, 'fallback');
        addToHistory('assistant', result.reply);
        showBookingBackButtons('movies');
    }

    /** Handle experience selection → fetch dates (Step 3) */
    async function handleExperienceSelected(experience) {
        if (!bookingState || !bookingState.selectedMovieId) return;

        bookingState.selectedExperience = experience;
        bookingState.step = 'choose_date';
        saveBookingState();

        addMessage('user', `🎞️ ${experience}`);
        addToHistory('user', experience);

        showTypingIndicator();
        const result = await bookingAction('get_dates', {
            movieId: bookingState.selectedMovieId,
            experience,
        });
        await sleep(400);
        hideTypingIndicator();

        if (!result || !result.buttons || result.buttons.length === 0) {
            addMessage('ai', result?.reply || `No dates available for ${experience}. 🕐`, null);
            bookingState.step = 'choose_experience';
            saveBookingState();
            showBookingBackButtons('experiences');
            return;
        }

        addMessageWithButtons(result.reply, result.buttons, 'fallback');
        addToHistory('assistant', result.reply);
        showBookingBackButtons('experiences');
    }

    /** Handle date selection → fetch filtered showtimes (Step 4) */
    async function handleDateSelected(date, dateLabel) {
        if (!bookingState || !bookingState.selectedMovieId || !bookingState.selectedExperience) return;

        bookingState.selectedDate = date;
        bookingState.selectedDateLabel = dateLabel || date;
        bookingState.step = 'choose_showtime';
        saveBookingState();

        addMessage('user', `📅 ${dateLabel || date}`);
        addToHistory('user', dateLabel || date);

        showTypingIndicator();
        const result = await bookingAction('get_shows_filtered', {
            movieId: bookingState.selectedMovieId,
            experience: bookingState.selectedExperience,
            date,
        });
        await sleep(400);
        hideTypingIndicator();

        if (!result || !result.buttons || result.buttons.length === 0) {
            addMessage('ai', result?.reply || 'No showtimes available for this date. 🕐', null);
            bookingState.step = 'choose_date';
            saveBookingState();
            showBookingBackButtons('dates');
            return;
        }

        addMessageWithButtons(result.reply, result.buttons, 'fallback');
        addToHistory('assistant', result.reply);
        showBookingBackButtons('dates');
    }

    /** Helper: show back/cancel buttons for booking flow */
    function showBookingBackButtons(backTarget) {
        DOM.suggestions.innerHTML = `
            <button class="chatbot-suggestion-chip" data-rebrowse="${backTarget}">
                <i class="fas fa-arrow-left"></i> Go back
            </button>
            <button class="chatbot-suggestion-chip chatbot-cancel-booking">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
    }

    /** Handle showtime selection → redirect to booking page (Option B) */
    async function handleShowSelected(showId, movieId) {
        // Find show label from last message buttons
        const showBtn = DOM.messages.querySelector(`[data-show-id="${showId}"]`);
        const showLabel = showBtn?.querySelector('.chatbot-showtime-time')?.textContent || 'this showtime';
        const movieTitle = showBtn?.dataset.movieTitle || bookingState?.selectedMovieTitle || 'the movie';
        const localMovieId = showBtn?.dataset.localMovieId || '';

        if (!bookingState) startBookingFlow();
        if (!bookingState) return;

        bookingState.selectedMovieId = movieId || bookingState.selectedMovieId;
        bookingState.selectedMovieTitle = movieTitle;
        bookingState.selectedShowTheater = showBtn?.dataset.theaterName || bookingState.selectedShowTheater || '';

        bookingState.selectedShowId = showId;
        bookingState.selectedShowTime = showLabel;
        bookingState.step = 'redirecting';
        saveBookingState();

        // Show user's choice
        addMessage('user', `🕐 ${showLabel}`);
        addToHistory('user', showLabel);

        // Use the movieId from the button or from booking state
        const redirectMovieId = movieId || bookingState.selectedMovieId;

        addMessage('ai', `Great choice! Redirecting you to select your seats for **${bookingState.selectedMovieTitle || 'the movie'}**...\n\n🎬 ${bookingState.selectedExperience || ''} • ${bookingState.selectedDateLabel || ''} • ${showLabel}`, null);

        // Store movie context for booking page
        sessionStorage.setItem('selectedMovie', JSON.stringify({
            id: redirectMovieId,
            tmdb_id: redirectMovieId,
            backendMovieId: localMovieId,
            title: bookingState.selectedMovieTitle || '',
            genre: '',
            rating: '',
            duration: '',
        }));

        resetBookingState();

        // Option B: Redirect with movieId + showId so booking page can auto-select
        setTimeout(() => {
            window.location.href = `booking.html?movieId=${redirectMovieId}&showId=${showId}`;
        }, 1200);
    }

    /** Handle Continue Booking click — redirect to booking page */
    function handleContinueBooking(btn) {
        const movieId = btn.dataset.movieId;
        const showId = btn.dataset.showId || '';
        const movieTitle = btn.dataset.movieTitle || '';
        const movieDuration = btn.dataset.movieDuration || '';

        if (!movieId) return;

        // Store movie in sessionStorage
        sessionStorage.setItem('selectedMovie', JSON.stringify({
            id: movieId,
            tmdb_id: movieId,
            backendMovieId: btn.dataset.localMovieId || '',
            title: movieTitle,
            genre: '',
            rating: '',
            duration: movieDuration,
        }));

        resetBookingState();

        // Option B redirect with showId
        const url = showId
            ? `booking.html?movieId=${movieId}&showId=${showId}`
            : `booking.html?movieId=${movieId}`;
        window.location.href = url;
    }

    // ============================================
    // API COMMUNICATION (General chatbot)
    // ============================================
    async function sendMessage(text) {
        if (isWaiting || !text.trim()) return;

        const userText = text.trim();
        isWaiting = true;
        DOM.sendBtn.disabled = true;
        DOM.input.value = '';

        // Add user message to UI and history
        addMessage('user', userText);
        addToHistory('user', userText);

        // Show typing indicator with realistic delay
        showTypingIndicator();

        const context = collectContext();

        // Prepare conversation history for API (capped)
        const apiHistory = conversationHistory.slice(-CFG.MAX_API_HISTORY);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 18000);

            const response = await fetch(CFG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    currentPage: context.currentPage,
                    bookingContext: context.bookingContext,
                    movieContext: context.movieContext,
                    conversationHistory: apiHistory,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Realistic typing delay
            const delay = CFG.TYPING_DELAY_MIN + Math.random() * (CFG.TYPING_DELAY_MAX - CFG.TYPING_DELAY_MIN);
            await sleep(delay);

            hideTypingIndicator();

            // Check if this is a booking_start intent → auto-trigger booking flow
            if (data.type === 'booking_start' && data.actionRequired === 'get_movies') {
                addMessage('ai', data.reply, data.source);
                addToHistory('assistant', data.reply);
                isWaiting = false;
                DOM.sendBtn.disabled = false;
                await handleBookMovies();
                return;
            }

            // Recommendation intent → show genre chips
            if (data.type === 'recommend_start' && data.genreChips) {
                addMessage('ai', data.reply, data.source);
                addToHistory('assistant', data.reply);
                isWaiting = false;
                DOM.sendBtn.disabled = false;
                renderGenreChips(data.genreChips);
                return;
            }

            if (data.buttons && data.buttons.length) {
                addMessageWithButtons(data.reply, data.buttons, data.source);
                addToHistory('assistant', data.reply);

                if (data.suggestions && data.suggestions.length) {
                    renderSuggestions(data.suggestions);
                } else {
                    renderQuickActions();
                }
                return;
            }

            addMessage('ai', data.reply, data.source);
            addToHistory('assistant', data.reply);

            // Update suggestions with follow-ups
            if (data.suggestions && data.suggestions.length) {
                renderSuggestions(data.suggestions);
            } else {
                renderQuickActions();
            }

        } catch (err) {
            hideTypingIndicator();

            if (err.name === 'AbortError') {
                addErrorMessage('Request timed out. Please try again.');
            } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                addMessage('ai',
                    '🎬 Oops! It seems our assistant is taking a popcorn break. The server might be offline. Please try again in a moment!',
                    null
                );
            } else {
                addErrorMessage('Something went wrong. Please try again.');
            }

            console.warn('Chatbot request failed:', err.message);
        } finally {
            isWaiting = false;
            DOM.sendBtn.disabled = false;
            // input hidden — no focus needed
        }
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ============================================
    // QUICK ACTION HANDLERS
    // ============================================
    /** Render genre selection chips for recommendations */
    function renderGenreChips(genres) {
        DOM.suggestions.innerHTML = genres.map(g =>
            `<button class="chatbot-suggestion-chip chatbot-genre-chip" data-genre="${escapeHTML(g)}">
                ${escapeHTML(g)}
            </button>`
        ).join('') + `
            <button class="chatbot-suggestion-chip chatbot-cancel-booking">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
    }

    /** Handle genre selection → fetch movies by genre from MongoDB */
    async function handleGenreSelected(genre) {
        addMessage('user', `🎭 ${genre}`);
        addToHistory('user', genre);

        // Start booking flow so movie clicks go through booking steps
        startBookingFlow();

        showTypingIndicator();
        const result = await bookingAction('get_movies_by_genre', { genre });
        await sleep(400);
        hideTypingIndicator();

        if (!result || !result.buttons || result.buttons.length === 0) {
            addMessage('ai', result?.reply || `No ${genre} movies available right now. 🎬`, null);
            resetBookingState();
            renderQuickActions();
            return;
        }

        addMessageWithButtons(result.reply, result.buttons, 'fallback');
        addToHistory('assistant', result.reply);

        DOM.suggestions.innerHTML = `
            <button class="chatbot-suggestion-chip chatbot-cancel-booking">
                <i class="fas fa-times"></i> Cancel booking
            </button>
        `;
    }

    /** Handle "Today's showtimes" quick action — fetch movies with shows directly */
    async function handleShowtimesAction() {
        // Auth check first — booking requires login
        if (!isLoggedIn()) {
            const currentPage = encodeURIComponent(window.location.pathname + window.location.search);
            addMessageWithButtons(
                '🔒 You need to log in first before booking tickets!',
                [{
                    type: 'continue_booking',
                    label: 'Log In',
                    movieId: '',
                    showId: '',
                    movieTitle: '',
                }],
                null
            );
            const lastMsg = DOM.messages.lastElementChild;
            const ctaWrap = lastMsg?.querySelector('.chatbot-cta-wrap');
            if (ctaWrap) {
                ctaWrap.innerHTML = `
                    <a href="login.html?redirect=${currentPage}" class="chatbot-cta-btn chatbot-cta-btn--login">
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Log In to Book</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                `;
            }
            renderQuickActions();
            return;
        }

        startBookingFlow();
        showTypingIndicator();

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(CFG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "What are today's showtimes?",
                    currentPage: collectContext().currentPage,
                    bookingContext: null,
                    movieContext: null,
                    conversationHistory: [],
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);
            await sleep(400);
            hideTypingIndicator();

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.buttons && data.buttons.length) {
                addMessageWithButtons(data.reply, data.buttons, data.source);
                addToHistory('assistant', data.reply);

                DOM.suggestions.innerHTML = `
                    <button class="chatbot-suggestion-chip chatbot-cancel-booking">
                        <i class="fas fa-times"></i> Cancel booking
                    </button>
                `;
            } else {
                addMessage('ai', data.reply || "No showtimes found right now.", data.source);
                addToHistory('assistant', data.reply);
                renderQuickActions();
                resetBookingState();
            }
        } catch (err) {
            hideTypingIndicator();
            addErrorMessage('Failed to load showtimes. Please try again.');
            renderQuickActions();
            resetBookingState();
        }
    }

    async function handleQuickAction(action) {
        switch (action) {
            case 'movies':
                addMessage('user', '🎬 Movies showing now');
                addToHistory('user', 'Movies showing now');
                await handleBrowseMovies();
                break;

            case 'showtimes':
                addMessage('user', '🕐 Showtimes');
                addToHistory('user', 'Showtimes');
                await handleShowtimesAction();
                break;

            case 'food':
                addMessage('user', '🍿 Food & drinks');
                addToHistory('user', 'Food & drinks');
                addMessage('ai',
                    '🍿 **Food & Drinks at THE HALL**\n\nEnjoy our premium cinema snacks:\n• **Popcorn** — Classic butter, Caramel, Cheese\n• **Nachos** — With salsa & cheese dip\n• **Hot Dogs** — Classic & loaded\n• **Drinks** — Soda, juice, water, coffee\n• **Combos** — Great value meal deals!\n\nYou can order at the counter or pre-order during checkout. 🎬',
                    null
                );
                renderQuickActions();
                break;

            case 'support':
                addMessage('ai',
                    '📞 **Contact Support**\n\nYou can reach us at:\n• **Email:** support@thehallcinemas.com\n• **Phone:** +20 123 456 7890\n• **Or visit** our [Contact Page](contact.html)\n\nWe\'re here to help! 🎬',
                    null
                );
                renderQuickActions();
                break;

            default:
                sendMessage(action);
        }
    }

    // ============================================
    // OPEN / CLOSE
    // ============================================
    function openChat() {
        isOpen = true;
        DOM.toggle.classList.add('active');
        DOM.window.classList.add('open');
        DOM.toggle.setAttribute('aria-label', 'Close cinema assistant');

        // Auto-focus input
        // input hidden — no focus needed
    }

    function closeChat() {
        isOpen = false;
        DOM.toggle.classList.remove('active');
        DOM.window.classList.remove('open');
        DOM.toggle.setAttribute('aria-label', 'Open cinema assistant');
    }

    function toggleChat() {
        if (isOpen) closeChat();
        else openChat();
    }

    // ============================================
    // RESTORE SESSION
    // ============================================
    function restoreSession() {
        if (conversationHistory.length === 0) {
            // Fresh session — show welcome + quick actions
            renderWelcome();
            renderQuickActions();
        } else {
            // Restore messages from history
            for (const msg of conversationHistory) {
                if (msg.role === 'user') {
                    addMessage('user', msg.content);
                } else if (msg.role === 'assistant') {
                    addMessage('ai', msg.content);
                }
            }
            renderQuickActions();
            scrollToBottom();
        }
    }

    // ============================================
    // EVENT BINDING
    // ============================================
    function bindEvents() {
        // Toggle button
        DOM.toggle.addEventListener('click', toggleChat);

        // Close / minimize
        DOM.close.addEventListener('click', closeChat);
        DOM.minimize.addEventListener('click', closeChat);

        // Send button
        DOM.sendBtn.addEventListener('click', () => {
            sendMessage(DOM.input.value);
        });

        // Enter key
        DOM.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(DOM.input.value);
            }
        });

        // Suggestions + Quick actions + Booking buttons (delegation)
        DOM.suggestions.addEventListener('click', (e) => {
            // Quick action buttons
            const actionBtn = e.target.closest('.chatbot-action-btn');
            if (actionBtn && !isWaiting) {
                handleQuickAction(actionBtn.dataset.action);
                return;
            }

            // Cancel booking
            const cancelBtn = e.target.closest('.chatbot-cancel-booking');
            if (cancelBtn) {
                resetBookingState();
                addMessage('ai', 'Booking cancelled. How else can I help you? 🎬', null);
                renderQuickActions();
                return;
            }

            // Rebrowse (go back in booking flow)
            const rebrowse = e.target.closest('[data-rebrowse]');
            if (rebrowse && !isWaiting) {
                const target = rebrowse.dataset.rebrowse;
                if (target === 'movies') {
                    handleBookMovies();
                } else if (target === 'experiences' && bookingState?.selectedMovieId) {
                    handleMovieSelected(bookingState.selectedMovieId);
                } else if (target === 'dates' && bookingState?.selectedMovieId && bookingState?.selectedExperience) {
                    handleExperienceSelected(bookingState.selectedExperience);
                } else if (target === 'shows' && bookingState?.selectedMovieId) {
                    handleMovieSelected(bookingState.selectedMovieId);
                }
                return;
            }

            // Genre chip clicked (recommendation flow)
            const genreChip = e.target.closest('.chatbot-genre-chip');
            if (genreChip && !isWaiting) {
                const genre = genreChip.dataset.genre;
                if (genre) handleGenreSelected(genre);
                return;
            }

            // Standard suggestion chips
            const chip = e.target.closest('.chatbot-suggestion-chip');
            if (chip && !isWaiting && !chip.classList.contains('chatbot-cancel-booking') && !chip.dataset.rebrowse && !chip.classList.contains('chatbot-genre-chip')) {
                sendMessage(chip.textContent);
            }
        });

        // Booking flow buttons inside messages (delegation on messages container)
        DOM.messages.addEventListener('click', (e) => {
            if (isWaiting) return;

            // Movie option clicked
            const movieBtn = e.target.closest('.chatbot-movie-btn');
            if (movieBtn) {
                const movieId = movieBtn.dataset.movieId;
                // Browse-only mode: redirect to movie detail page
                if (movieBtn.dataset.browseOnly === 'true') {
                    if (movieId) window.location.href = `movie-detail.html?id=${movieId}`;
                    return;
                }
                if (movieId) handleMovieSelected(movieId);
                return;
            }

            // Experience option clicked
            const expBtn = e.target.closest('.chatbot-experience-btn');
            if (expBtn) {
                const experience = expBtn.dataset.experience;
                if (experience) handleExperienceSelected(experience);
                return;
            }

            // Date option clicked
            const dateBtn = e.target.closest('.chatbot-date-btn');
            if (dateBtn) {
                const date = dateBtn.dataset.date;
                const label = dateBtn.querySelector('.chatbot-showtime-time')?.textContent || date;
                if (date) handleDateSelected(date, label);
                return;
            }

            // Showtime option clicked
            const showBtn = e.target.closest('.chatbot-showtime-btn');
            if (showBtn) {
                const showId = showBtn.dataset.showId;
                const movieId = showBtn.dataset.movieId;
                if (showId) handleShowSelected(showId, movieId);
                return;
            }

            // Continue Booking clicked
            const ctaBtn = e.target.closest('.chatbot-cta-btn');
            if (ctaBtn && !ctaBtn.classList.contains('chatbot-cta-btn--login')) {
                handleContinueBooking(ctaBtn);
                return;
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) closeChat();
        });

        // (input area hidden — no focus handler needed)
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        // Don't init on admin pages
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/admin')) return;

        buildUI();
        loadHistory();
        loadBookingState();
        restoreSession();
        bindEvents();
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

