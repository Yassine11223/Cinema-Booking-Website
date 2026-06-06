-- Migration 002: Create Movies Table

CREATE TABLE IF NOT EXISTS movies (
    id            SERIAL PRIMARY KEY,
    tmdb_id       INTEGER UNIQUE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    genre         VARCHAR(50),
    duration      INTEGER NOT NULL,
    rating        VARCHAR(10),
    release_date  DATE,
    poster_url    VARCHAR(500),
    trailer_url   VARCHAR(500),
    status        VARCHAR(20) DEFAULT 'now_showing' CHECK (status IN ('now_showing', 'coming_soon', 'ended')),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
