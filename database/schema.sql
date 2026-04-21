-- ============================================
-- Cinema Booking System - Complete Database Schema
-- PostgreSQL
-- ============================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    last_login    TIMESTAMP,
    login_count   INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- 2. Movies
CREATE TABLE IF NOT EXISTS movies (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    genre         VARCHAR(50),
    duration      INTEGER NOT NULL,               -- duration in minutes
    rating        VARCHAR(10),                     -- PG, PG-13, R, etc.
    release_date  DATE,
    poster_url    VARCHAR(500),
    trailer_url   VARCHAR(500),
    status        VARCHAR(20) DEFAULT 'now_showing' CHECK (status IN ('now_showing', 'coming_soon', 'ended')),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- 3. Theaters
CREATE TABLE IF NOT EXISTS theaters (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    capacity      INTEGER NOT NULL,
    screen_type   VARCHAR(50) DEFAULT 'standard' CHECK (screen_type IN ('standard', 'imax', '3d', '4dx', 'vip')),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- 4. Seats
CREATE TABLE IF NOT EXISTS seats (
    id            SERIAL PRIMARY KEY,
    theater_id    INTEGER NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
    row_label     VARCHAR(5) NOT NULL,             -- A, B, C, ...
    seat_number   INTEGER NOT NULL,                -- 1, 2, 3, ...
    seat_type     VARCHAR(20) DEFAULT 'standard' CHECK (seat_type IN ('standard', 'premium', 'vip')),
    UNIQUE(theater_id, row_label, seat_number)
);

-- 5. Shows (Screenings)
CREATE TABLE IF NOT EXISTS shows (
    id            SERIAL PRIMARY KEY,
    movie_id      INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    theater_id    INTEGER NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
    show_time     TIMESTAMP NOT NULL,
    price         DECIMAL(10, 2) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- 6. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id       INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    total_price   DECIMAL(10, 2) NOT NULL,
    status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Booking-Seats junction table (many-to-many)
CREATE TABLE IF NOT EXISTS booking_seats (
    id            SERIAL PRIMARY KEY,
    booking_id    INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id       INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    UNIQUE(booking_id, seat_id)
);

-- 7. Payments
CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    booking_id      INTEGER UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount          DECIMAL(10, 2) NOT NULL,
    payment_method  VARCHAR(50) NOT NULL,          -- 'credit_card', 'paypal', 'stripe'
    transaction_id  VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_shows_movie ON shows(movie_id);
CREATE INDEX idx_shows_theater ON shows(theater_id);
CREATE INDEX idx_shows_time ON shows(show_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_show ON bookings(show_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_seats_theater ON seats(theater_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
