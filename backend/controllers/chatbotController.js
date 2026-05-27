/**
 * Chatbot Controller — Cinema Booking System
 * Handles POST /api/chatbot
 * Tries OpenAI first, falls back to rule-based on any failure.
 */

const { getChatResponse } = require('../utils/openaiClient');
const { getFallbackResponse } = require('../utils/chatbotFallback');

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
