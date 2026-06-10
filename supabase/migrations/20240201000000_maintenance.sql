-- ============================================================
-- MAINTENANCE RECORDS (km-interval based services, e.g. LPG service, oil change)
-- ============================================================
-- Each row is a logged service event. The latest record per service_type
-- (highest odometer_km) determines the current "next due" reading.
-- next_due_km = odometer_km + interval_km.
--
-- NOTE: apply this migration manually in the Supabase dashboard SQL editor,
-- matching how 20240101000000_initial.sql is managed.

CREATE TABLE maintenance_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  date          DATE NOT NULL,
  service_type  TEXT NOT NULL,                       -- e.g. 'lpg_service', 'oil_change'
  odometer_km   INTEGER NOT NULL CHECK (odometer_km > 0),
  interval_km   INTEGER NOT NULL CHECK (interval_km > 0),
  cost          NUMERIC(10, 2) CHECK (cost IS NULL OR cost >= 0),  -- optional, NOT in cost stats
  notes         TEXT
);

CREATE TRIGGER maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_maintenance_records_user_date ON maintenance_records (user_id, date DESC);

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_records_select" ON maintenance_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "maintenance_records_insert" ON maintenance_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "maintenance_records_update" ON maintenance_records FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "maintenance_records_delete" ON maintenance_records FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RENEWALS (date-based obligations, e.g. OC insurance, przegląd inspection)
-- ============================================================
-- Tracks a "valid until" date per category. Cost is optional (you may only
-- know the expiry date, not the price). Latest valid_until per category is the
-- active renewal. Kept separate from cost stats, like maintenance_records.

CREATE TABLE renewals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  category      TEXT NOT NULL,                          -- 'insurance' (OC) | 'inspection' (przegląd) | custom
  valid_until   DATE NOT NULL,
  cost          NUMERIC(10, 2) CHECK (cost IS NULL OR cost >= 0),
  notes         TEXT
);

CREATE TRIGGER renewals_updated_at
  BEFORE UPDATE ON renewals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_renewals_user_valid ON renewals (user_id, valid_until);

ALTER TABLE renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renewals_select" ON renewals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "renewals_insert" ON renewals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "renewals_update" ON renewals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "renewals_delete" ON renewals FOR DELETE USING (auth.uid() = user_id);
