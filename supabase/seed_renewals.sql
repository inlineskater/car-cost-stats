-- One-time seed for the known renewal dates (Fiat Punto, DW1Y275).
-- Run this in the Supabase SQL editor AFTER applying 20240201000000_maintenance.sql.
-- It looks up your user by email so user_id is set correctly.
--
--   OC (insurance) valid until:        2026-09-14
--   Przegląd (inspection) valid until: 2027-03-05

INSERT INTO renewals (user_id, category, valid_until, notes)
SELECT id, 'insurance', DATE '2026-09-14', 'OC'
FROM auth.users WHERE email = 'yuriy.shavlov@gmail.com';

INSERT INTO renewals (user_id, category, valid_until, notes)
SELECT id, 'inspection', DATE '2027-03-05', 'Przegląd techniczny'
FROM auth.users WHERE email = 'yuriy.shavlov@gmail.com';
