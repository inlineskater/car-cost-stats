-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE fuel_type AS ENUM ('lpg', 'petrol');

CREATE TYPE cost_category AS ENUM (
  'inspection',
  'insurance',
  'service',
  'repair',
  'tax',
  'other'
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- FUEL ENTRIES
-- ============================================================
CREATE TABLE fuel_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL DEFAULT auth.uid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  date                DATE NOT NULL,
  fuel_type           fuel_type NOT NULL,
  liters              NUMERIC(8, 3) NOT NULL CHECK (liters > 0),
  price_per_liter     NUMERIC(8, 4) NOT NULL CHECK (price_per_liter > 0),
  total_cost          NUMERIC(10, 2) NOT NULL CHECK (total_cost > 0),
  mileage             INTEGER NOT NULL CHECK (mileage > 0),

  receipt_image_url   TEXT,
  odometer_image_url  TEXT,
  notes               TEXT,
  ai_parsed           BOOLEAN NOT NULL DEFAULT false
);

CREATE TRIGGER fuel_entries_updated_at
  BEFORE UPDATE ON fuel_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_fuel_entries_user_date ON fuel_entries (user_id, date DESC);
CREATE INDEX idx_fuel_entries_user_type ON fuel_entries (user_id, fuel_type);

-- ============================================================
-- OTHER COSTS
-- ============================================================
CREATE TABLE other_costs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL DEFAULT auth.uid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  date                DATE NOT NULL,
  category            cost_category NOT NULL,
  cost                NUMERIC(10, 2) NOT NULL CHECK (cost > 0),
  description         TEXT NOT NULL,
  next_due_date       DATE,
  attachment_url      TEXT,
  notes               TEXT
);

CREATE TRIGGER other_costs_updated_at
  BEFORE UPDATE ON other_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_other_costs_user_date     ON other_costs (user_id, date DESC);
CREATE INDEX idx_other_costs_next_due      ON other_costs (user_id, next_due_date)
  WHERE next_due_date IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_costs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_entries_select" ON fuel_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fuel_entries_insert" ON fuel_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fuel_entries_update" ON fuel_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fuel_entries_delete" ON fuel_entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "other_costs_select" ON other_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "other_costs_insert" ON other_costs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "other_costs_update" ON other_costs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "other_costs_delete" ON other_costs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE POLICIES (run after creating buckets in dashboard)
-- ============================================================
-- After creating private buckets 'receipts', 'odometers', 'attachments',
-- add these policies via Supabase dashboard → Storage → [bucket] → Policies:
--
-- SELECT policy: (storage.foldername(name))[1] = auth.uid()::text
-- INSERT policy: (storage.foldername(name))[1] = auth.uid()::text
-- DELETE policy: (storage.foldername(name))[1] = auth.uid()::text
