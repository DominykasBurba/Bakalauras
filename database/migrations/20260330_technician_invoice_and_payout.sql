ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_invoice_line_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_invoice_tax_rate_percent NUMERIC(9, 4) NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_invoice_purchase_order_ref VARCHAR(200) NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_work_photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_signature_acknowledgment TEXT NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_payout_status VARCHAR(40) NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_payout_approved_amount NUMERIC(12, 2) NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_payout_paid_at TIMESTAMPTZ NULL;

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS technician_payout_notes TEXT NULL;
