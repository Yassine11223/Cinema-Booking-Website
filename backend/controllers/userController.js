/**
 * User Controller - Handles auth, user management, 2-step verification, and newsletter
 * Tracks login_count and last_login on every successful login
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { generateOTP, verifyOTP } = require('../utils/otp');
const { sendOTPEmail, sendWelcomeEmail, sendNewsletterEmail } = require('../utils/email');

const userController = {
    // POST /api/users/register
    async register(req, res, next) {
        try {
            const { name, email, password, phone } = req.body;

            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(409).json({ message: 'Email already registered' });
            }

            const user = await User.create({ name, email, password, phone });
            const token = generateToken(user);

            // Send welcome email (non-blocking)
            sendWelcomeEmail(email, name).catch(err => {
                console.error('Welcome email failed:', err.message);
            });

            res.status(201).json({ user, token });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/login — Step 1: Validate credentials, send OTP
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isValid = await User.comparePassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate OTP and send via email
            const otpCode = generateOTP(email);
            const userName = user.name || 'there';

            // Send OTP email (non-blocking, but we log if it fails)
            sendOTPEmail(email, otpCode, userName).catch(err => {
                console.error('OTP email failed:', err.message);
            });

            res.json({
                requiresVerification: true,
                email: user.email,
                message: `Verification code sent to ${email}. Check your inbox.`,
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/verify-otp — Step 2: Verify OTP and return token
    async verifyLoginOTP(req, res, next) {
        try {
            const { email, code } = req.body;

            if (!email || !code) {
                return res.status(400).json({ message: 'Email and verification code are required.' });
            }

            const result = verifyOTP(email, code);
            if (!result.valid) {
                return res.status(400).json({ message: result.message });
            }

            // OTP valid — get user and generate token
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Track the login
            await User.recordLogin(user.id);

            const token = generateToken(user);
            const { password: _, ...userWithoutPassword } = user;

            res.json({ user: userWithoutPassword, token });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/resend-otp — Resend OTP for login
    async resendOTP(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: 'Email is required.' });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const otpCode = generateOTP(email);
            sendOTPEmail(email, otpCode, user.name || 'there').catch(err => {
                console.error('Resend OTP email failed:', err.message);
            });

            res.json({ message: 'New verification code sent.' });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users/profile
    async getProfile(req, res, next) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users  (admin)
    async getAll(req, res, next) {
        try {
            const users = await User.findAll();
            res.json(users);
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/users/profile
    async updateProfile(req, res, next) {
        try {
            const { name, phone } = req.body;
            const user = await User.update(req.user.id, { name, phone });
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/users/:id  (admin)
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            await User.delete(id);
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/users/:id/role  (admin)
    async updateRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            if (!['customer', 'admin', 'staff'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role. Must be customer, staff, or admin.' });
            }
            const user = await User.update(id, { role });
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/newsletter/subscribe
    async subscribeNewsletter(req, res, next) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            await User.update(req.user.id, { newsletter_subscribed: true });
            res.json({ message: 'Successfully subscribed to newsletter!' });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/newsletter/unsubscribe
    async unsubscribeNewsletter(req, res, next) {
        try {
            await User.update(req.user.id, { newsletter_subscribed: false });
            res.json({ message: 'Unsubscribed from newsletter.' });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/users/newsletter/send  (admin-only)
    async sendNewsletter(req, res, next) {
        try {
            const { subject, newsItems } = req.body;
            if (!subject || !newsItems || !Array.isArray(newsItems)) {
                return res.status(400).json({ message: 'Subject and newsItems array are required.' });
            }

            // Get all subscribed users
            const users = await User.findAll();
            const subscribers = users.filter(u => u.newsletter_subscribed);

            let sentCount = 0;
            for (const subscriber of subscribers) {
                try {
                    await sendNewsletterEmail(subscriber.email, subscriber.name, newsItems);
                    sentCount++;
                } catch (err) {
                    console.error(`Newsletter send failed for ${subscriber.email}:`, err.message);
                }
            }

            res.json({
                message: `Newsletter sent to ${sentCount} subscriber(s).`,
                totalSubscribers: subscribers.length,
                sentCount,
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/users/staff/dashboard  (staff or admin)
    async getStaffDashboard(req, res, next) {
        try {
            const { query: dbQuery } = require('../config/database');

            // Get today's shows
            const showsResult = await dbQuery(
                `SELECT s.*, m.title as movie_title, m.poster_url, t.name as theater_name, t.screen_type
                 FROM shows s
                 JOIN movies m ON s.movie_id = m.id
                 JOIN theaters t ON s.theater_id = t.id
                 WHERE DATE(s.show_time) = CURRENT_DATE
                 ORDER BY s.show_time ASC`
            );

            // Get today's bookings count
            const bookingsResult = await dbQuery(
                `SELECT COUNT(*) as total_bookings,
                        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                 FROM bookings
                 WHERE DATE(created_at) = CURRENT_DATE`
            );

            // Get recent bookings for check-in
            const recentBookings = await dbQuery(
                `SELECT b.*, u.name as customer_name, u.email as customer_email,
                        m.title as movie_title, s.show_time, t.name as theater_name
                 FROM bookings b
                 JOIN users u ON b.user_id = u.id
                 JOIN shows s ON b.show_id = s.id
                 JOIN movies m ON s.movie_id = m.id
                 JOIN theaters t ON s.theater_id = t.id
                 WHERE DATE(s.show_time) = CURRENT_DATE
                 ORDER BY s.show_time ASC
                 LIMIT 50`
            );

            res.json({
                todayShows: showsResult.rows,
                todayStats: bookingsResult.rows[0] || { total_bookings: 0, confirmed: 0, pending: 0 },
                recentBookings: recentBookings.rows,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = userController;
