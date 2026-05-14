ALTER TABLE users ADD COLUMN IF NOT EXISTS building_id INT REFERENCES buildings(id) ON DELETE SET NULL;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS building_id INT REFERENCES buildings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_building ON maintenance_requests(building_id);

UPDATE users SET building_id = 1 WHERE unit LIKE 'Building A%' AND role = 'Resident' AND building_id IS NULL;
UPDATE users SET building_id = 2 WHERE unit LIKE 'Building B%' AND role = 'Resident' AND building_id IS NULL;
UPDATE users SET building_id = 3 WHERE unit LIKE 'Building C%' AND role = 'Resident' AND building_id IS NULL;
UPDATE users SET building_id = 4 WHERE unit LIKE 'Building D%' AND role = 'Resident' AND building_id IS NULL;
UPDATE users SET building_id = 5 WHERE unit LIKE 'Building E%' AND role = 'Resident' AND building_id IS NULL;

UPDATE maintenance_requests m
SET building_id = u.building_id
FROM users u
WHERE m.created_by_user_id = u.id AND (m.building_id IS NULL OR m.building_id IS DISTINCT FROM u.building_id);
