CREATE TABLE IF NOT EXISTS daily_production (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    farm_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    production_date DATE NOT NULL,
    eggs INTEGER NOT NULL CHECK (eggs >= 0),
    mortality INTEGER NOT NULL CHECK (mortality >= 0),
    production_rate NUMERIC(5, 2) NOT NULL
        CHECK (production_rate >= 0 AND production_rate <= 100),
    submitted_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (farm_id, production_date)
);

CREATE INDEX IF NOT EXISTS daily_production_date_index
    ON daily_production (production_date DESC, farm_id);

ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;

-- Add an authenticated read policy after deciding how app users map to farms.
-- The EMQX PostgreSQL connector should use a dedicated database role that can
-- insert and update this table without exposing that role's password in the APK.
