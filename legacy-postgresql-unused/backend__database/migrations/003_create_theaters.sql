-- Migration 003: Create Theaters Table

CREATE TABLE IF NOT EXISTS theaters (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    capacity      INTEGER NOT NULL,
    screen_type   VARCHAR(50) DEFAULT 'standard' CHECK (screen_type IN ('standard', 'imax', '3d', '4dx', 'vip')),
    created_at    TIMESTAMP DEFAULT NOW()
);
