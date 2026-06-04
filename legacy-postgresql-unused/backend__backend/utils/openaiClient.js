/**
 * OpenAI Client — Cinema Chatbot
 * Wraps the OpenAI SDK for the cinema assistant.
 * Reads OPENAI_API_KEY from process.env (loaded by dotenv in server.js).
 */

const OpenAI = require('openai');

// ── System Prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are **Scene AI**, a premium cinema assistant for **Scene Cinemas**.
You help customers with:
- Movie recommendations (by mood, genre, comparison, occasion)
- Seat recommendations (IMAX → center-middle, Dolby → audio sweet spot, Standard → middle, Deluxe → comfort)
- Experience comparisons (IMAX = biggest screen, Dolby = best sound, Standard = affordable, Deluxe = premium comfort)
- Showtime guidance (afternoon = calmer, evening = popular, late-night = cinematic)
- Booking flow guidance (choose movie → date → showtime → experience → seats → checkout → payment → QR tickets)
- QR ticket explanation (each seat gets its own QR, used for cinema entry validation)
- Food/snack suggestions (action → popcorn+cola, horror → nachos, drama → desserts, groups → combos)
- Payment & checkout help

Rules:
- Be concise, warm, and cinematic in tone. Use occasional emojis (🎬 🍿 🎥).
- Never invent specific seat numbers, showtimes, or prices that you don't have data for.
- If booking data is provided in context, reference it naturally.
- If data is missing, say so clearly and give general advice instead.
- Never ask for credit card numbers or payment details.
- Keep responses under 150 words unless the user asks for a detailed explanation.
- When recommending, always explain briefly why.
- Offer 2-3 follow-up suggestion ideas at the end of substantial answers.`;

// ── Build context-enriched system message ──────────────────────────
function buildSystemMessage(bookingContext, movieContext, currentPage) {
    let contextBlock = '';

    if (currentPage) {
        contextBlock += `\nThe user is currently on: ${currentPage}`;
    }

    if (movieContext && typeof movieContext === 'object') {
        const parts = [];
        if (movieContext.title) parts.push(`Movie: ${movieContext.title}`);
        if (movieContext.genre) parts.push(`Genre: ${movieContext.genre}`);
        if (movieContext.rating) parts.push(`Rating: ${movieContext.rating}`);
        if (movieContext.duration) parts.push(`Duration: ${movieContext.duration}`);
        if (parts.length) contextBlock += `\nCurrent movie context: ${parts.join(', ')}`;
    }

    if (bookingContext && typeof bookingContext === 'object') {
        const parts = [];
        if (bookingContext.movie) parts.push(`Movie: ${bookingContext.movie}`);
        if (bookingContext.experience) parts.push(`Experience: ${bookingContext.experience}`);
        if (bookingContext.date) parts.push(`Date: ${bookingContext.date}`);
        if (bookingContext.showtime) parts.push(`Showtime: ${bookingContext.showtime}`);
        if (bookingContext.seats && bookingContext.seats.length) parts.push(`Seats: ${bookingContext.seats.join(', ')}`);
        if (bookingContext.seatCount) parts.push(`Tickets: ${bookingContext.seatCount}`);
        if (bookingContext.total) parts.push(`Total: ${bookingContext.total} ${bookingContext.currency || 'EGP'}`);
        if (bookingContext.pricePerSeat) parts.push(`Price/seat: ${bookingContext.pricePerSeat} ${bookingContext.currency || 'EGP'}`);
        if (parts.length) contextBlock += `\nBooking context: ${parts.join(', ')}`;
    }

    return SYSTEM_PROMPT + (contextBlock ? `\n\n--- Current Session Context ---${contextBlock}` : '');
}

// ── Chat Completion ────────────────────────────────────────────────
/**
 * Get a response from OpenAI.
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages [{role, content}, ...]
 * @param {Object} context - { bookingContext, movieContext, currentPage }
 * @returns {Promise<{reply: string, type: string, suggestions: string[]}>}
 */
async function getChatResponse(userMessage, conversationHistory = [], context = {}) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    const openai = new OpenAI({ apiKey });

    const systemMessage = buildSystemMessage(
        context.bookingContext,
        context.movieContext,
        context.currentPage
    );

    // Build messages array: system + conversation history (capped) + current
    const messages = [
        { role: 'system', content: systemMessage },
    ];

    // Append last 10 messages of history to control token usage
    const cappedHistory = conversationHistory.slice(-10);
    messages.push(...cappedHistory);
    messages.push({ role: 'user', content: userMessage });

    // 15-second timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const completion = await openai.chat.completions.create(
            {
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 400,
                temperature: 0.7,
            },
            { signal: controller.signal }
        );

        const reply = completion.choices[0]?.message?.content?.trim() || 'I apologize, I couldn\'t generate a response. Please try again.';

        // Detect response type from content
        const type = detectResponseType(reply, userMessage);

        // Generate contextual follow-up suggestions
        const suggestions = generateFollowUps(type, context);

        return { reply, type, suggestions };

    } finally {
        clearTimeout(timeout);
    }
}

// ── Response type detection ────────────────────────────────────────
function detectResponseType(reply, userMessage) {
    const combined = (reply + ' ' + userMessage).toLowerCase();
    if (/seat|row|center|middle/.test(combined)) return 'seat_recommendation';
    if (/imax|dolby|standard|deluxe|experience/.test(combined)) return 'experience_info';
    if (/recommend|suggest|watch|movie/.test(combined)) return 'movie_recommendation';
    if (/book|checkout|payment|pay/.test(combined)) return 'booking_help';
    if (/qr|ticket|scan/.test(combined)) return 'qr_help';
    if (/snack|food|popcorn|drink|combo/.test(combined)) return 'snacks_help';
    if (/showtime|time|schedule/.test(combined)) return 'showtime_help';
    return 'general';
}

// ── Dynamic follow-up suggestions ─────────────────────────────────
function generateFollowUps(type, context) {
    const followUps = {
        movie_recommendation: ['Show best IMAX seats', 'Compare Dolby and IMAX', 'Suggest snacks for my movie'],
        seat_recommendation: ['Which experience is best?', 'How do I book a ticket?', 'Recommend another movie'],
        experience_info: ['Show best seats for this', 'What\'s the best showtime?', 'Recommend me a movie'],
        booking_help: ['How does the QR ticket work?', 'Suggest snacks for my movie', 'Best seats available?'],
        qr_help: ['How do I book a ticket?', 'Suggest snacks for my movie', 'Recommend me a movie'],
        snacks_help: ['How do I book a ticket?', 'What\'s the best showtime?', 'Compare IMAX and Dolby'],
        showtime_help: ['Best seats for this time?', 'Which experience should I pick?', 'Suggest snacks'],
        general: ['Recommend me a movie', 'Help me choose seats', 'What experiences do you offer?'],
    };
    return followUps[type] || followUps.general;
}

module.exports = { getChatResponse };
