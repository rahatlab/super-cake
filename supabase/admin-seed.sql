-- ===========================================================================
--  Admin user seed for Super Cake
--  Run this in:  Supabase Dashboard -> SQL Editor -> New query -> Run
--
--  Login credentials:
--    Email: admin@supercake.com
--    Password: admin1234
-- ===========================================================================

-- Insert admin user with password "admin1234" (hashed with scrypt)
INSERT INTO profiles (id, name, phone, email, role, password_hash, created_at)
VALUES (
  'u_admin',
  'Super Cake Admin',
  '01627472766',
  'reset.rahat@gmail.com',
  'admin',
  'scrypt$2e34bcef6e46141b729df4f0c700782f$705b06706b91b114d1afc5d1b47ce80ce3ef104d38789501845a8ef1f72e462a52bb63bd07f872a0a8d9a12bb69a274f3c905be14aafb499195705ccb65933fd',
  now()
)
ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash;