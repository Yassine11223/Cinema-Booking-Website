-- ============================================
-- Sample Data for Development & Testing
-- Run AFTER schema.sql
-- ============================================

-- Admin user (password: admin123)
INSERT INTO users (name, email, password, phone, role) VALUES
('Admin User', 'admin@scenecinemas.com', '$2a$12$LJ3m4ys3uz2rOPWgiQbSzO3LsijVc5S5kEqL9mBRwWOdQGFR0gEOy', '+1234567890', 'admin');

-- Test customers (password: test123)
INSERT INTO users (name, email, password, phone, role) VALUES
('John Doe', 'john@example.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1987654321', 'customer'),
('Jane Smith', 'jane@example.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1122334455', 'customer');

-- Movies
INSERT INTO movies (title, description, genre, duration, rating, release_date, status) VALUES
('The Dark Knight Returns', 'A city needs its hero once more in this epic conclusion.', 'Action', 165, 'PG-13', '2026-04-01', 'now_showing'),
('Inception 2: Dreamscape', 'The boundaries between dreams and reality blur further.', 'Sci-Fi', 148, 'PG-13', '2026-04-10', 'now_showing'),
('The Grand Budapest Hotel 2', 'Another whimsical adventure at the legendary hotel.', 'Comedy', 120, 'PG', '2026-03-15', 'now_showing'),
('Interstellar: Beyond', 'Humanity reaches for the stars once again.', 'Sci-Fi', 170, 'PG-13', '2026-05-01', 'coming_soon'),
('The Matrix Resurrection', 'The system reboots with new purpose.', 'Action', 142, 'R', '2026-05-15', 'coming_soon');

-- Theaters
INSERT INTO theaters (name, capacity, screen_type) VALUES
('Hall 1 - IMAX', 200, 'imax'),
('Hall 2 - Standard', 150, 'standard'),
('Hall 3 - VIP', 60, 'vip'),
('Hall 4 - 3D', 120, '3d');

-- Seats for Hall 1 (rows A-J, 20 seats per row)
INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
SELECT 1, chr(64 + row_num), seat_num,
    CASE
        WHEN row_num <= 2 THEN 'vip'
        WHEN row_num <= 5 THEN 'premium'
        ELSE 'standard'
    END
FROM generate_series(1, 10) AS row_num,
     generate_series(1, 20) AS seat_num;

-- Seats for Hall 2 (rows A-H, 18 seats per row)
INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
SELECT 2, chr(64 + row_num), seat_num, 'standard'
FROM generate_series(1, 8) AS row_num,
     generate_series(1, 18) AS seat_num;

-- Seats for Hall 3 VIP (rows A-D, 15 seats per row)
INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
SELECT 3, chr(64 + row_num), seat_num, 'vip'
FROM generate_series(1, 4) AS row_num,
     generate_series(1, 15) AS seat_num;

-- Shows (screenings)
INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES
(1, 1, '2026-04-10 14:00', 15.00),
(1, 1, '2026-04-10 18:00', 18.00),
(1, 1, '2026-04-10 21:30', 18.00),
(2, 2, '2026-04-10 15:00', 12.00),
(2, 2, '2026-04-10 19:00', 14.00),
(3, 3, '2026-04-10 16:00', 25.00),
(3, 3, '2026-04-10 20:00', 25.00);
