-- Migration 007: Create Payments Table

CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    booking_id      INTEGER UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount          DECIMAL(10, 2) NOT NULL,
    payment_method  VARCHAR(50) NOT NULL,
    transaction_id  VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
