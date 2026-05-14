CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    building_id INT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    unit_code VARCHAR(80) NOT NULL,
    floor VARCHAR(40) NULL,
    area_sqm NUMERIC(12, 2) NULL,
    notes TEXT NULL,
    photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT uq_units_building_code UNIQUE (building_id, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_units_building ON units(building_id);

CREATE TABLE IF NOT EXISTS building_images (
    id SERIAL PRIMARY KEY,
    building_id INT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_building_images_building ON building_images(building_id);

CREATE TABLE IF NOT EXISTS occupancies (
    id SERIAL PRIMARY KEY,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at DATE NOT NULL,
    ended_at DATE NULL,
    CONSTRAINT chk_occupancy_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_occupancies_unit ON occupancies(unit_id);
CREATE INDEX IF NOT EXISTS idx_occupancies_user ON occupancies(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_occupancies_one_active_per_unit
    ON occupancies(unit_id) WHERE ended_at IS NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INT NULL REFERENCES units(id) ON DELETE SET NULL;
