-- ============================================
-- Cinema Booking System — Seed Data
-- Run AFTER schema.sql to populate initial data
-- ============================================

-- 1. Admin User (password: Admin123!)
-- bcrypt hash of 'Admin123!' with 10 rounds
INSERT INTO users (name, email, password, phone, role) VALUES
  ('Admin User', 'admin@scene.com', '$2b$10$8KzaNdKIMyOkASCakb/HgOwmBqcGp6VIW8sS9JH3RCXBBV0rbk5c6', '+20 100 000 0000', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Demo Customers (password for all: Password1)
-- bcrypt hash of 'Password1' with 10 rounds
INSERT INTO users (name, email, password, phone, role) VALUES
  ('Ahmed Hassan',  'ahmed@scene.com', '$2b$10$XF2fMFvOFqwVkSHcgCv0aOVBxJ5kcNzMVJ1VhTsB6YCeCKjXBLCPa', '+20 100 123 4567', 'customer'),
  ('Sara Mohamed',  'sara@scene.com',  '$2b$10$XF2fMFvOFqwVkSHcgCv0aOVBxJ5kcNzMVJ1VhTsB6YCeCKjXBLCPa', '+20 101 234 5678', 'customer'),
  ('Omar Ali',      'omar@scene.com',  '$2b$10$XF2fMFvOFqwVkSHcgCv0aOVBxJ5kcNzMVJ1VhTsB6YCeCKjXBLCPa', '+20 102 345 6789', 'customer'),
  ('Nour Ibrahim',  'nour@scene.com',  '$2b$10$XF2fMFvOFqwVkSHcgCv0aOVBxJ5kcNzMVJ1VhTsB6YCeCKjXBLCPa', '+20 103 456 7890', 'customer')
ON CONFLICT (email) DO NOTHING;

-- 3. Theaters
INSERT INTO theaters (name, capacity, screen_type) VALUES
  ('IMAX Theatre',  310, 'imax'),
  ('Dolby Atmos',   256, 'standard'),
  ('Hall 1',        200, 'standard'),
  ('Deluxe Suite',  116, 'vip')
ON CONFLICT DO NOTHING;

-- 4. Seats for each theater
-- IMAX Theatre (id=1): rows A-P, varied widths
DO $$
DECLARE
  theater_rec RECORD;
  r TEXT;
  n INT;
BEGIN
  -- IMAX Theatre seats
  SELECT id INTO theater_rec FROM theaters WHERE name = 'IMAX Theatre' LIMIT 1;
  IF theater_rec.id IS NOT NULL THEN
    FOREACH r IN ARRAY ARRAY['A','B','C','D','E','F','G','H','J','K'] LOOP
      FOR n IN 1..27 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, CASE WHEN r IN ('A','B') THEN 'premium' ELSE 'standard' END)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['L','M'] LOOP
      FOR n IN 1..23 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, 'standard')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOR n IN 1..19 LOOP
      INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
      VALUES (theater_rec.id, 'N', n, 'standard')
      ON CONFLICT DO NOTHING;
    END LOOP;
    FOR n IN 1..15 LOOP
      INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
      VALUES (theater_rec.id, 'P', n, 'standard')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Dolby Atmos seats
  SELECT id INTO theater_rec FROM theaters WHERE name = 'Dolby Atmos' LIMIT 1;
  IF theater_rec.id IS NOT NULL THEN
    FOREACH r IN ARRAY ARRAY['A','B','C','D','E','F','G','H','J'] LOOP
      FOR n IN 1..24 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, CASE WHEN r = 'A' THEN 'premium' ELSE 'standard' END)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['K','L'] LOOP
      FOR n IN 1..19 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, 'standard')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOR n IN 1..16 LOOP
      INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
      VALUES (theater_rec.id, 'M', n, 'standard')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Hall 1 seats
  SELECT id INTO theater_rec FROM theaters WHERE name = 'Hall 1' LIMIT 1;
  IF theater_rec.id IS NOT NULL THEN
    FOREACH r IN ARRAY ARRAY['A','B','C','D','E','F','G','H'] LOOP
      FOR n IN 1..21 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, 'standard')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['J','K'] LOOP
      FOR n IN 1..16 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, 'standard')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOR n IN 1..13 LOOP
      INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
      VALUES (theater_rec.id, 'L', n, 'standard')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Deluxe Suite seats
  SELECT id INTO theater_rec FROM theaters WHERE name = 'Deluxe Suite' LIMIT 1;
  IF theater_rec.id IS NOT NULL THEN
    FOR n IN 1..14 LOOP
      INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
      VALUES (theater_rec.id, 'A', n, 'vip')
      ON CONFLICT DO NOTHING;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['B','C','D','E','F'] LOOP
      FOR n IN 1..17 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, 'vip')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['G','H'] LOOP
      FOR n IN 1..13 LOOP
        INSERT INTO seats (theater_id, row_label, seat_number, seat_type)
        VALUES (theater_rec.id, r, n, 'vip')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 5. Movies (matches TMDB-style data the frontend expects)
INSERT INTO movies (title, description, genre, duration, rating, release_date, poster_url, status) VALUES
  ('Thunderbolts*', 'A ragtag group of antiheroes are recruited by the government for dangerous missions.', 'Action', 127, 'PG-13', '2025-05-02', 'https://image.tmdb.org/t/p/w500/qbkAqmmEIZfrCO8ZQAuIuVMlWoV.jpg', 'now_showing'),
  ('Mission: Impossible - The Final Reckoning', 'Ethan Hunt faces his most dangerous mission yet in the thrilling conclusion.', 'Action', 169, 'PG-13', '2025-05-23', 'https://image.tmdb.org/t/p/w500/z4lYMBkMB9sG9bCPLEBSNDJaNaF.jpg', 'now_showing'),
  ('Lilo & Stitch', 'A lonely Hawaiian girl adopts an unusual pet who is actually a genetic experiment.', 'Family', 108, 'PG', '2025-05-23', 'https://image.tmdb.org/t/p/w500/2GHacm1sYDUXp6YuAuXxfmMgLJi.jpg', 'now_showing'),
  ('The Amateur', 'A CIA cryptographer uncovers a conspiracy after a personal tragedy.', 'Thriller', 126, 'R', '2025-04-11', 'https://image.tmdb.org/t/p/w500/vJk5JLBbLWRb7vQN4Ur1LKmZaQA.jpg', 'now_showing'),
  ('Sinners', 'Two brothers return to their hometown seeking a fresh start but find evil lurking.', 'Horror', 137, 'R', '2025-04-18', 'https://image.tmdb.org/t/p/w500/sARLVl4rIhi06FxvaFOqKaBr18p.jpg', 'now_showing'),
  ('Superman', 'James Gunn''s reimagining of the Man of Steel. Clark Kent protects Metropolis.', 'Action', 143, 'PG-13', '2025-07-11', NULL, 'coming_soon'),
  ('Avatar: Fire & Ash', 'Jake Sully and Neytiri confront a new threat to Pandora.', 'Sci-Fi', 160, 'PG-13', '2025-12-19', NULL, 'coming_soon')
ON CONFLICT DO NOTHING;

-- 6. Shows (screenings) — next 7 days from a reference point
-- We generate shows dynamically for TODAY + 6 days
DO $$
DECLARE
  d DATE;
  movie_rec RECORD;
  imax_id INT;
  dolby_id INT;
  hall1_id INT;
  deluxe_id INT;
BEGIN
  SELECT id INTO imax_id FROM theaters WHERE name = 'IMAX Theatre' LIMIT 1;
  SELECT id INTO dolby_id FROM theaters WHERE name = 'Dolby Atmos' LIMIT 1;
  SELECT id INTO hall1_id FROM theaters WHERE name = 'Hall 1' LIMIT 1;
  SELECT id INTO deluxe_id FROM theaters WHERE name = 'Deluxe Suite' LIMIT 1;

  FOR i IN 0..6 LOOP
    d := CURRENT_DATE + i;

    FOR movie_rec IN SELECT id FROM movies WHERE status = 'now_showing' LOOP
      -- IMAX shows
      IF imax_id IS NOT NULL THEN
        INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES
          (movie_rec.id, imax_id, d + TIME '12:00', 320),
          (movie_rec.id, imax_id, d + TIME '15:30', 320),
          (movie_rec.id, imax_id, d + TIME '19:00', 320),
          (movie_rec.id, imax_id, d + TIME '22:15', 320)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Dolby shows
      IF dolby_id IS NOT NULL THEN
        INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES
          (movie_rec.id, dolby_id, d + TIME '11:00', 280),
          (movie_rec.id, dolby_id, d + TIME '14:00', 280),
          (movie_rec.id, dolby_id, d + TIME '17:30', 280),
          (movie_rec.id, dolby_id, d + TIME '21:00', 280)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Standard shows
      IF hall1_id IS NOT NULL THEN
        INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES
          (movie_rec.id, hall1_id, d + TIME '11:30', 180),
          (movie_rec.id, hall1_id, d + TIME '14:15', 180),
          (movie_rec.id, hall1_id, d + TIME '17:00', 180),
          (movie_rec.id, hall1_id, d + TIME '20:30', 180),
          (movie_rec.id, hall1_id, d + TIME '23:00', 180)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Deluxe shows
      IF deluxe_id IS NOT NULL THEN
        INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES
          (movie_rec.id, deluxe_id, d + TIME '13:00', 250),
          (movie_rec.id, deluxe_id, d + TIME '16:30', 250),
          (movie_rec.id, deluxe_id, d + TIME '19:45', 250)
        ON CONFLICT DO NOTHING;
      END IF;

    END LOOP;
  END LOOP;
END $$;
