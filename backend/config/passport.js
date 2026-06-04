const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const passport = require('passport');
const User = require('../models/User');

const hasGoogleConfig =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL;

if (hasGoogleConfig) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

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
                    let user = await User.findOne({ google_id: googleId });
                    if (user) {
                        return done(null, user);
                    }

                    // 2. Check if user already exists by email
                    user = await User.findOne({ email });
                    if (user) {
                        user.google_id = googleId;
                        user.auth_provider = 'google';
                        if (!user.profile_photo) {
                            user.profile_photo = profilePhoto;
                        }
                        await user.save();
                        return done(null, user);
                    }

                    // 3. Create new Google customer
                    const newUser = new User({
                        name,
                        email,
                        password: null,
                        phone: null,
                        role: 'customer',
                        google_id: googleId,
                        auth_provider: 'google',
                        profile_photo: profilePhoto,
                        login_count: 0,
                    });
                    await newUser.save();

                    return done(null, newUser);
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );
} else {
    console.warn(
        '⚠️  Google OAuth is disabled — missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL in .env'
    );
}

module.exports = passport;
