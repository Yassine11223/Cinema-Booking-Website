const { sendEmail } = require('../utils/email');

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const subjectLabels = {
    general: 'General Inquiry',
    booking: 'Booking Issue',
    refund: 'Refund Request',
    feedback: 'Feedback',
    partnership: 'Partnership / Events',
    other: 'Other',
};

async function sendContactMessage(req, res, next) {
    try {
        const { name, email, subject, message } = req.body;
        const errors = [];

        if (!name || name.trim().length < 2) errors.push('Name is required.');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required.');
        if (!subject || !subjectLabels[subject]) errors.push('Subject is required.');
        if (!message || message.trim().length < 5) errors.push('Message is required.');

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Validation failed', errors });
        }

        await sendEmail({
            to: email.trim(),
            subject: `Vision X Cinemas Contact - ${subjectLabels[subject]}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">
                    <h2 style="color:#b71c1c;">Contact Message Received</h2>
                    <p>Hello ${escapeHtml(name.trim())},</p>
                    <p>We received this message from the contact form:</p>
                    <div style="border:1px solid #ddd;border-radius:8px;padding:16px;background:#fafafa;">
                        <p><strong>From:</strong> ${escapeHtml(name.trim())} &lt;${escapeHtml(email.trim())}&gt;</p>
                        <p><strong>Topic:</strong> ${escapeHtml(subjectLabels[subject])}</p>
                        <p style="white-space:pre-wrap;">${escapeHtml(message.trim())}</p>
                    </div>
                    <p>Our team will reply soon.</p>
                </div>
            `,
        });

        res.json({ message: 'Message sent successfully.' });
    } catch (error) {
        next(error);
    }
}

module.exports = { sendContactMessage };
