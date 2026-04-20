-- Property Manager — PostgreSQL schema
-- Run after: CREATE DATABASE property_management;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;

CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    total_units INT NOT NULL CHECK (total_units >= 0),
    occupied_units INT NOT NULL CHECK (occupied_units >= 0),
    residents_count INT NOT NULL CHECK (residents_count >= 0),
    open_requests INT NOT NULL DEFAULT 0
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Resident', 'Technician')),
    unit VARCHAR(200) NOT NULL DEFAULT '',
    building_id INT REFERENCES buildings(id) ON DELETE SET NULL
);

CREATE TABLE maintenance_requests (
    id VARCHAR(50) PRIMARY KEY,
    created_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    building_id INT REFERENCES buildings(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    date_created DATE NOT NULL,
    assigned_technician VARCHAR(200) NOT NULL DEFAULT 'Not assigned',
    photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_maintenance_created_by ON maintenance_requests(created_by_user_id);
CREATE INDEX idx_maintenance_building ON maintenance_requests(building_id);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    relative_time VARCHAR(100) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(80) NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

CREATE TABLE bills (
    bill_id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(200) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE INDEX idx_bills_user ON bills(user_id);
