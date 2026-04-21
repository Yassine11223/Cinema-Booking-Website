-- ============================================
-- Migration: Add login tracking to users
-- Run this against your PostgreSQL database
-- ============================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS login_count  INTEGER DEFAULT 0;

-- Index for fast ordering by last login
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC NULLS LAST);
