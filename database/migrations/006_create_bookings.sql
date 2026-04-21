-- Migration 006: Create Bookings Table

CREATE TABLE IF NOT EXISTS bookings (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id       INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    total_price   DECIMAL(10, 2) NOT NULL,
    status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Junction table for booking ↔ seats (many-to-many)
CREATE TABLE IF NOT EXISTS booking_seats (
    id            SERIAL PRIMARY KEY,
    booking_id    INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id       INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    UNIQUE(booking_id, seat_id)
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_show ON bookings(show_id);
CREATE INDEX idx_bookings_status ON bookings(status);
