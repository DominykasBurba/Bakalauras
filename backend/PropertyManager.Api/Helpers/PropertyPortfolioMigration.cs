namespace PropertyManager.Api.Helpers;

/// <summary>Idempotent DDL for units, building images, occupancies, users.unit_id.</summary>
public static class PropertyPortfolioMigration
{
    public static readonly string[] SqlStatements =
    [
        """
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
        """,
        """CREATE INDEX IF NOT EXISTS idx_units_building ON units(building_id);""",
        """
        CREATE TABLE IF NOT EXISTS building_images (
            id SERIAL PRIMARY KEY,
            building_id INT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            caption VARCHAR(500) NULL,
            sort_order INT NOT NULL DEFAULT 0
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_building_images_building ON building_images(building_id);""",
        """
        CREATE TABLE IF NOT EXISTS occupancies (
            id SERIAL PRIMARY KEY,
            unit_id INT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            started_at DATE NOT NULL,
            ended_at DATE NULL,
            CONSTRAINT chk_occupancy_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_occupancies_unit ON occupancies(unit_id);""",
        """CREATE INDEX IF NOT EXISTS idx_occupancies_user ON occupancies(user_id);""",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_occupancies_one_active_per_unit
            ON occupancies(unit_id) WHERE ended_at IS NULL;
        """,
        // At most one open-ended occupancy per resident (enforced after cleaning legacy duplicates).
        """
        UPDATE occupancies o
        SET ended_at = GREATEST(o.started_at, CURRENT_DATE)
        WHERE o.ended_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM (
                SELECT DISTINCT ON (user_id) id AS keep_id
                FROM occupancies
                WHERE ended_at IS NULL
                ORDER BY user_id, started_at DESC NULLS LAST, id DESC
            ) k
            WHERE k.keep_id = o.id
          );
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_occupancies_one_active_per_user
            ON occupancies(user_id) WHERE ended_at IS NULL;
        """,
        """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INT NULL REFERENCES units(id) ON DELETE SET NULL;
        """,
        """ALTER TABLE occupancies ADD COLUMN IF NOT EXISTS lease_end_date DATE NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_status VARCHAR(32) NOT NULL DEFAULT 'approved';""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40) NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200) NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(40) NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS about_me TEXT NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_comment TEXT NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_submitted_at TIMESTAMPTZ NULL;""",
        """ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_reviewed_at TIMESTAMPTZ NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS resident_feedback TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS admin_response_to_resident TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS admin_decline_reason TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_completion_notes TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_url TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_amount NUMERIC(12, 2) NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_notes TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_submitted_at TIMESTAMPTZ NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_line_items JSONB NOT NULL DEFAULT '[]'::jsonb;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_tax_rate_percent NUMERIC(12, 4) NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_invoice_purchase_order_ref VARCHAR(300) NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_work_photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_signature_acknowledgment TEXT NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_payout_status VARCHAR(80) NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_payout_approved_amount NUMERIC(12, 2) NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_payout_paid_at TIMESTAMPTZ NULL;""",
        """ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS technician_payout_notes TEXT NULL;""",
        """ALTER TABLE bills ADD COLUMN IF NOT EXISTS maintenance_request_id VARCHAR(50) NULL REFERENCES maintenance_requests(id) ON DELETE SET NULL;""",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_bills_maintenance_request
            ON bills(maintenance_request_id) WHERE maintenance_request_id IS NOT NULL;
        """,
        """ALTER TABLE bills ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;""",
        """ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method VARCHAR(120) NULL;""",
        """
        CREATE TABLE IF NOT EXISTS scheduled_maintenance (
            id SERIAL PRIMARY KEY,
            building_id INT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            description TEXT NULL,
            scheduled_date DATE NOT NULL,
            time_window VARCHAR(120) NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_scheduled_maintenance_building ON scheduled_maintenance(building_id);""",
        """
        CREATE TABLE IF NOT EXISTS technician_offered_services (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            description TEXT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_technician_offered_services_user ON technician_offered_services(user_id);""",
        """
        CREATE TABLE IF NOT EXISTS technician_profiles (
            user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            company_name VARCHAR(200) NULL,
            contractor_type VARCHAR(40) NULL,
            license_number VARCHAR(120) NULL,
            license_expiry DATE NULL,
            coi_expiry DATE NULL,
            workers_comp_expiry DATE NULL,
            w9_on_file BOOLEAN NOT NULL DEFAULT FALSE,
            background_check_on_file BOOLEAN NOT NULL DEFAULT FALSE,
            after_hours_on_call BOOLEAN NOT NULL DEFAULT FALSE,
            po_required BOOLEAN NOT NULL DEFAULT FALSE,
            billing_email VARCHAR(200) NULL,
            billing_phone VARCHAR(40) NULL,
            rate_notes TEXT NULL,
            service_area_notes TEXT NULL,
            internal_notes TEXT NULL,
            additional_insured_entity VARCHAR(300) NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        // Legacy unit fees table only — do NOT drop service_catalog_* here; that would erase catalog data on every API restart.
        """DROP TABLE IF EXISTS unit_service_fees;""",
        """
        CREATE TABLE IF NOT EXISTS service_catalog_items (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_service_catalog_sort ON service_catalog_items(sort_order);""",
        """
        CREATE TABLE IF NOT EXISTS technician_service_catalog_links (
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            catalog_item_id INT NOT NULL REFERENCES service_catalog_items(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, catalog_item_id)
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_technician_service_catalog_item ON technician_service_catalog_links(catalog_item_id);""",
        """ALTER TABLE technician_offered_services ADD COLUMN IF NOT EXISTS review_status VARCHAR(40) NOT NULL DEFAULT 'approved';""",
        """ALTER TABLE technician_offered_services ADD COLUMN IF NOT EXISTS admin_review_note TEXT NULL;""",
        """
        ALTER TABLE technician_offered_services ADD COLUMN IF NOT EXISTS mapped_catalog_item_id INT NULL
            REFERENCES service_catalog_items(id) ON DELETE SET NULL;
        """,
    ];
}
