-- Migration 004: Create Seats Table

CREATE TABLE IF NOT EXISTS seats (
    id            SERIAL PRIMARY KEY,
    theater_id    INTEGER NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
    row_label     VARCHAR(5) NOT NULL,
    seat_number   INTEGER NOT NULL,
    seat_type     VARCHAR(20) DEFAULT 'standard' CHECK (seat_type IN ('standard', 'premium', 'vip')),
    UNIQUE(theater_id, row_label, seat_number)
);

CREATE INDEX idx_seats_theater ON seats(theater_id);
