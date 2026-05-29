-- ============================================
-- Migration: Add superadmin role
-- ============================================

-- Update the role CHECK constraint to include 'superadmin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'superadmin'));

-- Insert a default superadmin user (password: superadmin112)
-- Hash generated with bcrypt 12 rounds
INSERT INTO users (name, email, password, phone, role, login_count)
VALUES (
    'Super Admin',
    'superadmin@scene.com',
    '$2a$12$LJ3m4ys3uz2rOPWgiQbSzO3LsijVc5S5kEqL9mBRwWOdQGFR0gEOy',
    '+20 100 000 0001',
    'superadmin',
    0
) ON CONFLICT (email) DO NOTHING;
