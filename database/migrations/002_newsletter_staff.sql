-- ============================================
-- Migration 002: Newsletter & Staff Role
-- ============================================

-- Add newsletter and email verification columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update role CHECK constraint to include 'staff'
-- First drop the existing constraint, then add the new one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'admin', 'staff'));

-- Newsletter campaign tracking table
CREATE TABLE IF NOT EXISTS newsletter_emails (
    id            SERIAL PRIMARY KEY,
    subject       VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    sent_by       INTEGER REFERENCES users(id),
    recipient_count INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- OTP verification codes table (persistent alternative to in-memory)
CREATE TABLE IF NOT EXISTS otp_codes (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    code          VARCHAR(6) NOT NULL,
    expires_at    TIMESTAMP NOT NULL,
    used          BOOLEAN DEFAULT false,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_created ON newsletter_emails(created_at);
