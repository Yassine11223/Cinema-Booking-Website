-- Migration 005: Create Shows Table

CREATE TABLE IF NOT EXISTS shows (
    id            SERIAL PRIMARY KEY,
    movie_id      INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    theater_id    INTEGER NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
    show_time     TIMESTAMP NOT NULL,
    price         DECIMAL(10, 2) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shows_movie ON shows(movie_id);
CREATE INDEX idx_shows_theater ON shows(theater_id);
CREATE INDEX idx_shows_time ON shows(show_time);
