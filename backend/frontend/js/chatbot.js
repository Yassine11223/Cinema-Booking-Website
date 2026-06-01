/**
 * ============================================
 * SCENE AI — Cinema Chatbot (Frontend)
 * Self-contained IIFE with singleton guard.
 * Context-aware, session-persistent, premium UI.
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
        HISTORY_KEY: 'scene_chatbot_history',
        MAX_HISTORY: 20,       // max messages in sessionStorage
        MAX_API_HISTORY: 10,   // max messages sent to backend
        TYPING_DELAY_MIN: 600,
        TYPING_DELAY_MAX: 1500,
    };

    // ── State ──────────────────────────────────────────
    let isOpen = false;
    let isWaiting = false;
    let conversationHistory = [];

    // ── DOM refs (populated on init) ───────────────────
    let DOM = {};

    // ── Quick suggestions ──────────────────────────────
    const DEFAULT_SUGGESTIONS = [
        'Recommend me a movie',
        'Help me choose the best seats',
        'IMAX vs Dolby?',
        'Which experience should I choose?',
        'How do I book a ticket?',
        'How does the QR ticket work?',
        'Suggest snacks for my movie',
        'What is the best showtime?',
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
                    title: parsed.title || null,
                    genre: parsed.genre || null,
                    rating: parsed.rating || null,
                    duration: parsed.duration || null,
                };
            }
        } catch (_) { /* safe */ }

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
            // Keep last MAX_HISTORY messages
            const toSave = conversationHistory.slice(-CFG.MAX_HISTORY);
            sessionStorage.setItem(CFG.HISTORY_KEY, JSON.stringify(toSave));
        } catch (_) { /* quota exceeded — ignore */ }
    }

    function addToHistory(role, content) {
        conversationHistory.push({ role, content });
        saveHistory();
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
                    <div class="chatbot-header-title">Scene AI Assistant</div>
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
            <div class="chatbot-input-area">
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
            <div class="chatbot-welcome-title">Welcome to Scene AI</div>
            <div class="chatbot-welcome-subtitle">Your personal cinema assistant. Ask me about movies, seats, experiences, showtimes, or anything cinema-related!</div>
        `;
        DOM.messages.appendChild(welcome);
    }

    function renderSuggestions(suggestions) {
        const items = suggestions || DEFAULT_SUGGESTIONS;
        DOM.suggestions.innerHTML = items.map(s =>
            `<button class="chatbot-suggestion-chip">${escapeHTML(s)}</button>`
        ).join('');
    }

    function addMessage(role, text, source) {
        const msgEl = document.createElement('div');
        msgEl.className = `chatbot-msg ${role}`;

        // Format markdown-like content
        const formatted = formatMessage(text);

        if (role === 'ai') {
            msgEl.innerHTML = `
                <div class="chatbot-msg-avatar"><i class="fas fa-film"></i></div>
                <div>
                    <div class="chatbot-msg-bubble">${formatted}</div>
                    ${source ? `<div class="chatbot-msg-source">${source === 'openai' ? '✨ AI Powered' : '🎯 Scene Assistant'}</div>` : ''}
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
    // API COMMUNICATION
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
            addMessage('ai', data.reply, data.source);
            addToHistory('assistant', data.reply);

            // Update suggestions with follow-ups
            if (data.suggestions && data.suggestions.length) {
                renderSuggestions(data.suggestions);
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
            DOM.input.focus();
        }
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
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
        setTimeout(() => DOM.input.focus(), 350);
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
            // Fresh session — show welcome + default suggestions
            renderWelcome();
            renderSuggestions(DEFAULT_SUGGESTIONS);
        } else {
            // Restore messages from history
            for (const msg of conversationHistory) {
                if (msg.role === 'user') {
                    addMessage('user', msg.content);
                } else if (msg.role === 'assistant') {
                    addMessage('ai', msg.content);
                }
            }
            renderSuggestions(DEFAULT_SUGGESTIONS);
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

        // Quick suggestion chips (delegation)
        DOM.suggestions.addEventListener('click', (e) => {
            const chip = e.target.closest('.chatbot-suggestion-chip');
            if (chip && !isWaiting) {
                sendMessage(chip.textContent);
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) closeChat();
        });

        // Prevent focus loss on mobile keyboard
        DOM.input.addEventListener('focus', () => {
            setTimeout(() => scrollToBottom(), 300);
        });
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
