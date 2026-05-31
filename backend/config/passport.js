require('dotenv').config();

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./database');

if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Missing GOOGLE_CLIENT_ID in .env');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_CLIENT_SECRET in .env');
}

if (!process.env.GOOGLE_CALLBACK_URL) {
    throw new Error('Missing GOOGLE_CALLBACK_URL in .env');
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName || 'Google User';
                const profilePhoto = profile.photos?.[0]?.value || null;

                if (!email) {
                    return done(new Error('Google account has no email'), null);
                }

                // 1. Check if user already exists by Google ID
                let result = await query(
                    'SELECT * FROM users WHERE google_id = $1',
                    [googleId]
                );

                if (result.rows.length > 0) {
                    return done(null, result.rows[0]);
                }

                // 2. Check if user already exists by email
                result = await query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );

                if (result.rows.length > 0) {
                    const updatedUser = await query(
                        `UPDATE users
                         SET google_id = $1,
                             auth_provider = 'google',
                             profile_photo = $2,
                             updated_at = NOW()
                         WHERE email = $3
                         RETURNING *`,
                        [googleId, profilePhoto, email]
                    );

                    return done(null, updatedUser.rows[0]);
                }

                // 3. Create new Google customer
                const newUser = await query(
                    `INSERT INTO users
                     (name, email, password, phone, role, google_id, auth_provider, profile_photo, login_count)
                     VALUES ($1, $2, NULL, NULL, 'customer', $3, 'google', $4, 0)
                     RETURNING *`,
                    [name, email, googleId, profilePhoto]
                );

                return done(null, newUser.rows[0]);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

module.exports = passport;