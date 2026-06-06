/**
 * Chatbot Controller — Cinema Booking System
 * Handles POST /api/chatbot
 * Tries OpenAI first, falls back to rule-based on any failure.
 */

const { getChatResponse } = require('../utils/openaiClient');
const { getFallbackResponse } = require('../utils/chatbotFallback');
const {
    getShowtimesReplyForTmdbMovie,
    getGeneralShowtimesReply,
    getMoviesListReply,
    getMoviesByGenreReply,
} = require('./chatbotBookingController');

function isShowtimeQuestion(message) {
    return /\b(showtimes?|show\s*times?|schedule|when|what\s*time|times?)\b/i.test(message);
}

function isMoviesAvailabilityQuestion(message) {
    const msg = message.toLowerCase();
    return /\b(movies?|films?)\b/.test(msg)
        && /\b(available|showing|playing|now|current|currently|list|what|which)\b/.test(msg);
}

function isBookingStart(message) {
    const msg = message.toLowerCase().trim();
    return /^(i\s+want\s+to\s+book|book\s+a\s+ticket|book\s+ticket|buy\s+a\s+ticket|buy\s+ticket|let'?s\s+book|start\s+booking|get\s+tickets|i\s+want\s+tickets|book\s+now|book\s+me)/.test(msg)
        || /^book$/.test(msg);
}

function isRecommendationStart(message) {
    const msg = message.toLowerCase().trim();
    return /\b(recommend|suggest|what\s+should\s+i\s+watch|what\s+to\s+watch|any\s+good\s+movies|movie\s+suggestion)\b/.test(msg);
}

const GENRE_CHIPS = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Adventure', 'Animation'];

function extractRequestedGenre(message) {
    const msg = message.toLowerCase();
    return GENRE_CHIPS.find((genre) => {
        const normalized = genre.toLowerCase();
        if (normalized === 'sci-fi') return /\b(sci-fi|sci\s*fi|science fiction)\b/.test(msg);
        return new RegExp(`\\b${normalized}\\b`).test(msg);
    }) || null;
}

/**
 * POST /api/chatbot
 * Body: { message, currentPage, bookingContext, movieContext, conversationHistory }
 * Response: { reply, type, suggestions, source }
 */
async function handleChat(req, res) {
    try {
        const {
            message,
            currentPage,
            bookingContext,
            movieContext,
            conversationHistory,
        } = req.body;

        // Validate input
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                reply: 'Please type a message so I can help you! 🎬',
                type: 'error',
                suggestions: ['Recommend me a movie', 'Help me choose seats'],
                source: 'fallback',
            });
        }

        const trimmedMessage = message.trim();
        const context = {
            bookingContext: bookingContext || null,
            movieContext: movieContext || null,
            currentPage: currentPage || null,
        };
        const history = Array.isArray(conversationHistory) ? conversationHistory : [];

        if (isMoviesAvailabilityQuestion(trimmedMessage)) {
            return res.json(await getMoviesListReply());
        }

        if (isShowtimeQuestion(trimmedMessage) && context.movieContext?.tmdb_id) {
            const result = await getShowtimesReplyForTmdbMovie(context.movieContext.tmdb_id);
            return res.json(result);
        }

        if (isShowtimeQuestion(trimmedMessage)) {
            return res.json(await getGeneralShowtimesReply());
        }

        if (isBookingStart(trimmedMessage)) {
            return res.json({
                reply: "Great, let's book your tickets. First, I'll show you the movies currently playing.",
                type: 'booking_start',
                suggestions: [],
                actionRequired: 'get_movies',
                source: 'fallback',
            });
        }

        // Recommendation intent — return genre selection chips
        if (isRecommendationStart(trimmedMessage)) {
            const requestedGenre = extractRequestedGenre(trimmedMessage);
            if (requestedGenre) {
                return res.json(await getMoviesByGenreReply(requestedGenre));
            }

            return res.json({
                reply: "🎬 I'd love to help you find the perfect movie! What genre are you in the mood for?",
                type: 'recommend_start',
                suggestions: GENRE_CHIPS,
                genreChips: GENRE_CHIPS,
                source: 'fallback',
            });
        }

        // Attempt OpenAI first
        const apiKey = process.env.OPENAI_API_KEY;

        if (apiKey && apiKey !== 'your_openai_api_key_here') {
            try {
                const aiResult = await getChatResponse(trimmedMessage, history, context);
                return res.json({
                    reply: aiResult.reply,
                    type: aiResult.type,
                    suggestions: aiResult.suggestions,
                    source: 'openai',
                });
            } catch (err) {
                // Log abbreviated error (never log full API key)
                console.warn('⚠️ OpenAI request failed, using fallback:', err.message);
            }
        }

        // Fallback
        const fallback = getFallbackResponse(trimmedMessage, context);
        return res.json({
            reply: fallback.reply,
            type: fallback.type,
            suggestions: fallback.suggestions,
            actionRequired: fallback.actionRequired || null,
            source: 'fallback',
        });

    } catch (err) {
        console.error('❌ Chatbot controller error:', err.message);
        return res.status(500).json({
            reply: 'Something went wrong on my end. Please try again in a moment! 🎬',
            type: 'error',
            suggestions: ['Recommend me a movie', 'How do I book a ticket?'],
            source: 'fallback',
        });
    }
}

module.exports = { handleChat };
