/**
 * Movie Model - SQL Queries
 */

const { query } = require('../config/database');

const Movie = {
    async ensureTmdbSupport() {
        await query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_id INTEGER', []);
        await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id)', []);
    },

    async findAll(filters = {}) {
        await this.ensureTmdbSupport();
        let sql = 'SELECT * FROM movies';
        const params = [];
        const conditions = [];

        if (filters.status) {
            params.push(filters.status);
            conditions.push(`status = $${params.length}`);
        }

        if (filters.genre) {
            params.push(filters.genre);
            conditions.push(`genre = $${params.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY release_date DESC';
        const result = await query(sql, params);
        return result.rows;
    },

    async findById(id) {
        await this.ensureTmdbSupport();
        const result = await query('SELECT * FROM movies WHERE id = $1', [id]);
        return result.rows[0];
    },

    async findByTmdbId(tmdbId) {
        await this.ensureTmdbSupport();
        const result = await query('SELECT * FROM movies WHERE tmdb_id = $1', [Number(tmdbId)]);
        return result.rows[0];
    },

    async upsertFromTmdb(movie) {
        await this.ensureTmdbSupport();
        const duration = movie.duration || movie.runtime || 0;
        const result = await query(
            `INSERT INTO movies (tmdb_id, title, description, genre, duration, rating, release_date, poster_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'now_showing')
             ON CONFLICT (tmdb_id)
             DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                genre = EXCLUDED.genre,
                duration = EXCLUDED.duration,
                rating = EXCLUDED.rating,
                release_date = EXCLUDED.release_date,
                poster_url = EXCLUDED.poster_url,
                status = 'now_showing',
                updated_at = NOW()
             RETURNING *`,
            [
                Number(movie.tmdb_id),
                movie.title,
                movie.description || '',
                movie.genre || 'Movie',
                duration,
                movie.rating || 'NR',
                movie.release_date || null,
                movie.poster_url || movie.poster || null,
            ]
        );
        return result.rows[0];
    },

    async create({ title, description, genre, duration, rating, release_date, poster_url, trailer_url, status }) {
        await this.ensureTmdbSupport();
        const result = await query(
            `INSERT INTO movies (title, description, genre, duration, rating, release_date, poster_url, trailer_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, description, genre, duration, rating, release_date, poster_url, trailer_url, status]
        );
        return result.rows[0];
    },

    async update(id, fields) {
        await this.ensureTmdbSupport();
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const result = await query(
            `UPDATE movies SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
            [...values, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await this.ensureTmdbSupport();
        await query('DELETE FROM movies WHERE id = $1', [id]);
    }
};

module.exports = Movie;
