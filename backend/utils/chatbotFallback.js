/**
 * Rule-Based Fallback — Cinema Chatbot
 * Provides polished cinema-themed responses when OpenAI is unavailable.
 */

// ── Intent Detection ───────────────────────────────────────────────
function detectIntent(message) {
    const msg = message.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|howdy|good\s*(morning|evening|afternoon)|sup|yo)\b/.test(msg)) {
        return 'greeting';
    }

    // Movie recommendations
    if (/recommend|suggest.*movie|what.*watch|movie.*like|something.*(exciting|scary|funny|emotional|romantic|action|thriller|horror|drama|comedy|sci-fi|mystery|mind.?blow|epic)|i want.*(movie|film)|going.*(friend|date|family|group)/.test(msg)) {
        return 'recommend_movie';
    }

    // Seat recommendations
    if (/seat|best.*seat|choose.*seat|where.*sit|front.*row|center|middle|row|view/.test(msg)) {
        return 'recommend_seats';
    }

    // Experience comparison
    if (/imax.*dolby|dolby.*imax|experience|imax|dolby|standard|deluxe|biggest.*screen|best.*sound|comfort|premium|cheaper|affordable/.test(msg)) {
        return 'compare_experiences';
    }

    // Showtime help
    if (/showtime|best.*time|less.*crowd|calm|evening|afternoon|late.*night|schedule|when.*show/.test(msg)) {
        return 'showtime_help';
    }

    // Active booking request (user wants to book NOW, not just asking how)
    if (/^(i\s+want\s+to\s+book|book\s+a\s+ticket|book\s+ticket|buy\s+a\s+ticket|buy\s+ticket|let'?s\s+book|start\s+booking|get\s+tickets|i\s+want\s+tickets|book\s+now|book\s+me)/.test(msg)
        || /^book$/.test(msg)) {
        return 'booking_start';
    }

    // Booking help (general how-to questions)
    if (/book|how.*book|checkout|can't.*checkout|what.*next|step|process|how.*do.*i|unavailable/.test(msg)) {
        return 'booking_help';
    }

    // QR ticket
    if (/qr|ticket|scan|entry|validation|print|download/.test(msg)) {
        return 'qr_help';
    }

    // Snacks / food
    if (/snack|food|popcorn|drink|nachos|combo|cola|soda|candy|eat|menu/.test(msg)) {
        return 'snacks_help';
    }

    // Payment
    if (/pay|payment|card|fawry|visa|credit|debit|refund|price|cost|how.*much/.test(msg)) {
        return 'payment_help';
    }

    return 'fallback';
}

// ── Response Templates ─────────────────────────────────────────────
const RESPONSES = {
    booking_start: {
        replies: [
            "🎬 Let's get you booked! I'll help you find the perfect movie and showtime. Let me pull up what's currently showing...",
            "🎟️ Great, let's book your tickets! First, let me show you the movies currently playing...",
        ],
        type: 'booking_start',
        suggestions: [],
        actionRequired: 'get_movies',
    },

    greeting: {
        replies: [
            "Hey there! 🎬 Welcome to THE HALL CINEMASs! I'm your AI cinema assistant. I can help you pick the perfect movie, find the best seats, compare experiences, and much more. What can I help you with?",
            "Hello! 🍿 I'm THE HALL AI, your personal cinema copilot. Whether you need movie recommendations, seat advice, or help with your booking — I've got you covered. What would you like to know?",
        ],
        type: 'greeting',
        suggestions: ['Recommend me a movie', 'Help me choose seats', 'What experiences do you offer?'],
    },

    recommend_movie: {
        replies: [
            "🎥 Great choice wanting a recommendation! Here are some top picks at THE HALL CINEMASs:\n\n• **Action/Sci-Fi lovers**: Anything with epic visuals is best enjoyed in IMAX — think Dune, Interstellar-level epics.\n• **Horror fans**: Grab some nachos and settle in for a thrilling ride in Dolby for maximum audio immersion.\n• **Drama/Romance**: A Deluxe experience gives you comfort to enjoy emotional storytelling.\n• **Comedy/Friends night**: Standard is a great budget-friendly pick for group outings.\n\nWhat mood are you in tonight? I can narrow it down! 🎬",
            "🍿 Let me help you find the perfect film! Consider what you're in the mood for:\n\n• **Something epic?** → Go for big-screen spectacles in IMAX\n• **Something immersive?** → Dolby Atmos sound makes thrillers unforgettable\n• **Something cozy?** → Deluxe comfort seating for dramas and romances\n• **Budget-friendly fun?** → Standard halls are perfect for comedies with friends\n\nTell me more about what you're looking for and I'll give you a tailored recommendation!",
        ],
        type: 'movie_recommendation',
        suggestions: ['I want something exciting', 'I\'m going on a date', 'Compare IMAX and Dolby'],
    },

    recommend_seats: {
        replies: [
            "🎯 Here's my expert seat guide for THE HALL CINEMASs:\n\n**IMAX** — Center-middle rows (D-H) give the most immersive viewing angle. Avoid the first 2 rows and extreme sides.\n\n**Dolby** — The audio sweet spot is center rows (D-G). Dolby Atmos sound surrounds you regardless, but center is where it all balances perfectly.\n\n**Standard** — Middle rows offer the best value-to-view ratio. Rows C-F are ideal.\n\n**Deluxe** — Every seat is premium comfort, but center positions still offer the best visual balance.\n\n💡 **Group tip:** Always pick adjacent seats in the center section for the best shared experience!",
        ],
        type: 'seat_recommendation',
        suggestions: ['Best seats for IMAX?', 'I\'m booking for 2 people', 'Which experience should I choose?'],
    },

    compare_experiences: {
        replies: [
            "🎬 Here's your THE HALL CINEMASs experience breakdown:\n\n**🖥️ IMAX** — The biggest screen in the house. Perfect for action, sci-fi, and visually stunning films. Go big or go home!\n\n**🔊 Dolby Cinema** — The best sound immersion with Dolby Atmos. A balanced premium experience with stunning visuals AND audio.\n\n**🎟️ Standard** — The affordable everyday option. Great quality at a friendly price — perfect for casual moviegoers.\n\n**✨ Deluxe** — Smaller premium hall with luxury comfort seating. Ideal for intimate viewing and maximum comfort.\n\n**Quick comparison:**\n• Biggest screen → IMAX\n• Best sound → Dolby\n• Best value → Standard\n• Most comfort → Deluxe",
        ],
        type: 'experience_info',
        suggestions: ['Best seats for IMAX?', 'Best seats for Dolby?', 'Recommend me a movie for IMAX'],
    },

    showtime_help: {
        replies: [
            "🕐 Here's my showtime advice:\n\n• **Afternoon (11am-3pm)** — Calmer, fewer crowds. Great for families or a relaxed experience.\n• **Evening (5pm-8pm)** — Most popular! Vibrant atmosphere but book early for best seats.\n• **Late Night (9pm+)** — Cinematic and calm. Perfect for date nights or immersive solo viewing.\n\n💡 **Pro tip:** Weekday afternoons tend to have the smallest crowds. If you want the best seat selection, book early for popular showtimes!",
        ],
        type: 'showtime_help',
        suggestions: ['I want a calm showtime', 'Best seats for evening?', 'How do I book a ticket?'],
    },

    booking_help: {
        replies: [
            "📋 Here's how to book at THE HALL CINEMASs in 8 easy steps:\n\n1️⃣ **Choose a movie** from our Now Showing section\n2️⃣ **Select a date** from the available calendar\n3️⃣ **Pick a showtime** — choose from IMAX, Dolby, Standard, or Deluxe\n4️⃣ **Select your seats** on the interactive seat map\n5️⃣ **Add food & drinks** (optional but highly recommended! 🍿)\n6️⃣ **Choose payment method** — Visa/Credit Card or Fawry\n7️⃣ **Complete payment** securely\n8️⃣ **Get your QR tickets** — one per seat, ready for entry!\n\n💡 You have a 10-minute reservation window once you start selecting seats, so don't wait too long!",
        ],
        type: 'booking_help',
        suggestions: ['How does the QR ticket work?', 'What payment methods?', 'Help me choose seats'],
    },

    qr_help: {
        replies: [
            "🎟️ Here's everything about your QR tickets:\n\n• **Each seat gets its own QR ticket** — so if you booked 3 seats, you get 3 QR codes.\n• **What's inside:** Movie name, showtime, date, seat number, and booking reference.\n• **How to use:** Show the QR code at the cinema entrance for validation and entry.\n• **Print or digital:** You can print your tickets or show them on your phone.\n• **Food/snacks** are handled separately and are NOT embedded in the QR code.\n\n💡 Pro tip: Screenshot your QR tickets just in case you lose connection at the cinema!",
        ],
        type: 'qr_help',
        suggestions: ['How do I book a ticket?', 'Suggest snacks for my movie', 'Recommend me a movie'],
    },

    snacks_help: {
        replies: [
            "🍿 My snack recommendations by movie type:\n\n**Action/Sci-Fi** — Classic Large Popcorn + Cola combo. You'll need energy for those epic scenes!\n\n**Horror/Thriller** — Spicy Nachos + a refreshing drink. The crunch matches the tension! 🌶️\n\n**Drama/Romance** — Light desserts or a milkshake. Keep it smooth and refined.\n\n**Comedy** — Sharing combo! Friends + snacks + laughs = perfect night.\n\n**Long movies (2.5h+)** — Go for the Large Combo — you'll thank me halfway through!\n\n💡 Add your snacks during checkout in the Food & Drinks step. They'll be ready for you at the concession counter!",
        ],
        type: 'snacks_help',
        suggestions: ['How do I book a ticket?', 'What experiences do you offer?', 'Recommend me a movie'],
    },

    payment_help: {
        replies: [
            "💳 THE HALL CINEMASs offers secure payment options:\n\n**Visa / Credit Card** — Enter your card details securely during checkout. Quick and instant confirmation.\n\n**Fawry** — Get a reference number and pay at any Fawry outlet, ATM, or through the Fawry app.\n\n💡 Your seats are reserved for 10 minutes once selected, so complete payment promptly to secure your booking!\n\nAfter payment, you'll receive your QR ticket(s) instantly on the confirmation page.",
        ],
        type: 'payment_help',
        suggestions: ['How does the QR ticket work?', 'How do I book a ticket?', 'Recommend me a movie'],
    },

    fallback: {
        replies: [
            "🎬 I'm not quite sure I understood that, but I'm here to help with anything cinema-related! I can:\n\n• 🎥 Recommend movies based on your mood\n• 💺 Suggest the best seats\n• 🔊 Compare IMAX, Dolby, Standard & Deluxe\n• 🕐 Help with showtimes\n• 📋 Guide you through booking\n• 🎟️ Explain QR tickets\n• 🍿 Suggest perfect snacks\n\nWhat would you like to know?",
            "I'd love to help! Could you tell me a bit more about what you're looking for? I'm great with movie recommendations, seat advice, experience comparisons, and booking guidance. 🎬",
        ],
        type: 'general',
        suggestions: ['Recommend me a movie', 'Help me choose seats', 'How do I book a ticket?'],
    },
};

// ── Main Fallback Function ─────────────────────────────────────────
/**
 * Generate a fallback response based on keyword matching.
 * @param {string} message - User message
 * @param {Object} context - { bookingContext, movieContext, currentPage }
 * @returns {{reply: string, type: string, suggestions: string[]}}
 */
function getFallbackResponse(message, context = {}) {
    const intent = detectIntent(message);
    const template = RESPONSES[intent] || RESPONSES.fallback;

    // Pick a random reply variant
    const reply = template.replies[Math.floor(Math.random() * template.replies.length)];

    // Enrich with booking context if available
    let enrichedReply = reply;
    if (context.bookingContext) {
        const bc = context.bookingContext;
        if (bc.movie && intent !== 'greeting') {
            enrichedReply += `\n\n📌 I see you're looking at **${bc.movie}**`;
            if (bc.experience) enrichedReply += ` in **${bc.experience}**`;
            if (bc.seats && bc.seats.length) enrichedReply += ` with seats **${bc.seats.join(', ')}**`;
            enrichedReply += '.';
        }
    }

    return {
        reply: enrichedReply,
        type: template.type,
        suggestions: template.suggestions,
        actionRequired: template.actionRequired || null,
    };
}

module.exports = { getFallbackResponse };
