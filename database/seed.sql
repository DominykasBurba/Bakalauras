-- Property Manager — seed data (realistic demo)
-- Password for all accounts: Password123!
-- Run after schema.sql
--
-- Portfolio (units, images, occupancies) is applied automatically when you run the API
-- in Development (see Helpers/DemoPortfolioSeed.cs). Requires this seed.sql first.
--
-- Building A–E map to buildings 1–5 (The Meridian … Bay View Towers).
-- Counts: 1 admin, 10 residents (id 2–11), 5 technicians (id 12–16)
--         12 buildings, 12 maintenance requests, 12 notifications, 12 bills

BEGIN;

INSERT INTO buildings (name, address, total_units, occupied_units, residents_count, open_requests) VALUES
  ('The Meridian', '1200 Harbor View Dr, Seattle, WA', 120, 112, 248, 14),
  ('Parkside Commons', '88 Elm Street, Portland, OR', 80, 76, 168, 9),
  ('Riverside Lofts', '450 River Rd, Austin, TX', 96, 91, 205, 11),
  ('Cedar Heights', '22 Cedar Lane, Denver, CO', 64, 62, 142, 6),
  ('Bay View Towers', '1 Marina Blvd, San Diego, CA', 200, 188, 412, 22),
  ('Maple Row', '300 Maple Ave, Chicago, IL', 48, 45, 98, 4),
  ('Summit Place', '775 Summit Ave, Boston, MA', 72, 70, 156, 8),
  ('Oak & Fourth', '400 Oak St, Minneapolis, MN', 56, 54, 119, 5),
  ('The Foundry', '900 Industrial Way, Pittsburgh, PA', 88, 82, 181, 10),
  ('Garden Court', '15 Garden Path, Atlanta, GA', 104, 99, 224, 12),
  ('Lakeshore 9', '2 Lakeshore Dr, Madison, WI', 36, 35, 72, 3),
  ('Metro Station Flats', '50 Transit Plaza, Philadelphia, PA', 144, 138, 302, 16);

INSERT INTO users (id, name, email, password, role, unit, building_id) VALUES
  (1, 'Admin User', 'admin@local.test', 'Password123!', 'Admin', 'HQ', NULL),
  (2, 'Sarah Chen', 'resident@local.test', 'Password123!', 'Resident', 'Building A, Unit 204', 1),
  (3, 'Marcus Webb', 'resident02@local.test', 'Password123!', 'Resident', 'Building A, Unit 312', 1),
  (4, 'Priya Patel', 'resident03@local.test', 'Password123!', 'Resident', 'Building B, Unit 108', 2),
  (5, 'Diego Alvarez', 'resident04@local.test', 'Password123!', 'Resident', 'Building B, Unit 215', 2),
  (6, 'Emily Foster', 'resident05@local.test', 'Password123!', 'Resident', 'Building C, Unit 402', 3),
  (7, 'James Okonkwo', 'resident06@local.test', 'Password123!', 'Resident', 'Building C, Unit 505', 3),
  (8, 'Nina Kowalski', 'resident07@local.test', 'Password123!', 'Resident', 'Building A, Unit 118', 1),
  (9, 'Oliver Hughes', 'resident08@local.test', 'Password123!', 'Resident', 'Building D, Unit 220', 4),
  (10, 'Aisha Rahman', 'resident09@local.test', 'Password123!', 'Resident', 'Building D, Unit 331', 4),
  (11, 'Tom Brennan', 'resident10@local.test', 'Password123!', 'Resident', 'Building E, Penthouse 1', 5),
  (12, 'John Smith', 'tech01@local.test', 'Password123!', 'Technician', 'Service — North', NULL),
  (13, 'Maria Garcia', 'tech02@local.test', 'Password123!', 'Technician', 'Service — North', NULL),
  (14, 'David Lee', 'tech03@local.test', 'Password123!', 'Technician', 'Service — South', NULL),
  (15, 'Alex Rivera', 'tech04@local.test', 'Password123!', 'Technician', 'Service — South', NULL),
  (16, 'Jordan Kim', 'tech05@local.test', 'Password123!', 'Technician', 'Service — Central', NULL);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('buildings', 'id'), (SELECT MAX(id) FROM buildings));

INSERT INTO maintenance_requests (id, created_by_user_id, building_id, title, description, status, priority, date_created, assigned_technician, photo_urls) VALUES
  ('REQ-001', 2, 1, 'Kitchen faucet dripping', 'Leaks from the base when water is turned on. Started last week.', 'In Progress', 'Medium', '2026-02-18', 'John Smith', '[]'::jsonb),
  ('REQ-002', 2, 1, 'Hallway light flickering', 'Bulb fixture near elevator 4 flickers every few minutes.', 'Registered', 'Low', '2026-02-22', 'Not assigned', '[]'::jsonb),
  ('REQ-003', 2, 1, 'AC weak in bedroom', 'Bedroom never reaches set temperature above 74°F.', 'Registered', 'High', '2026-03-01', 'Maria Garcia', '[]'::jsonb),
  ('REQ-004', 2, 1, 'Mailbox lock jammed', 'Cannot insert key smoothly; needs lubrication or replacement.', 'Completed', 'Low', '2026-01-10', 'David Lee', '[]'::jsonb),
  ('REQ-005', 3, 1, 'Garage door sensor', 'Sensor sometimes trips when nothing is there.', 'In Progress', 'Medium', '2026-02-28', 'Alex Rivera', '[]'::jsonb),
  ('REQ-006', 3, 1, 'Water heater noise', 'Rumbling sound when heating — not urgent but worth checking.', 'Registered', 'Medium', '2026-03-05', 'Not assigned', '[]'::jsonb),
  ('REQ-007', 4, 2, 'Balcony drain clogged', 'Standing water after rain.', 'In Progress', 'High', '2026-03-08', 'Jordan Kim', '[]'::jsonb),
  ('REQ-008', 4, 2, 'Smoke detector chirp', 'Battery replaced 2 days ago; still chirps at night.', 'Registered', 'High', '2026-03-10', 'John Smith', '[]'::jsonb),
  ('REQ-009', 5, 2, 'Broken cabinet hinge', 'Upper kitchen cabinet door sagging.', 'Completed', 'Low', '2026-02-01', 'Maria Garcia', '[]'::jsonb),
  ('REQ-010', 6, 3, 'Intercom static', 'Cannot hear visitors clearly from lobby.', 'In Progress', 'Medium', '2026-02-25', 'David Lee', '[]'::jsonb),
  ('REQ-011', 7, 3, 'Window seal draft', 'Cold draft from living room window.', 'Registered', 'Medium', '2026-03-12', 'Not assigned', '[]'::jsonb),
  ('REQ-012', 8, 1, 'Laundry room dryer', 'Dryer runs but clothes stay damp after full cycle.', 'Registered', 'Medium', '2026-03-14', 'Alex Rivera', '[]'::jsonb);

INSERT INTO notifications (user_id, message, relative_time) VALUES
  (2, 'Your maintenance request REQ-001 has been assigned to a technician', '2 hours ago'),
  (2, 'Monthly service charge reminder: invoice due March 31', '1 day ago'),
  (2, 'Package delivered to front desk — pickup by 8 PM', '3 days ago'),
  (2, 'Pool maintenance: hot tub closed Tuesday 9–11 AM', '5 days ago'),
  (2, 'Community meeting: budget Q2 — April 2, 7 PM', '1 week ago'),
  (3, 'REQ-005 update: Technician assigned', '4 hours ago'),
  (3, 'Parking garage P2 lighting upgrade scheduled', '2 days ago'),
  (3, 'Reminder: renters insurance renewal', '6 days ago'),
  (4, 'REQ-007: We have received your photos', '1 hour ago'),
  (4, 'Elevator B inspection complete — all clear', '3 days ago'),
  (5, 'Welcome packet — building Wi-Fi and amenities', 'Just now'),
  (6, 'REQ-010: Technician en route tomorrow 10–12', '30 minutes ago');

INSERT INTO bills (bill_id, user_id, type, amount, due_date, status) VALUES
  ('BILL-2026-03-001', 2, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-002', 3, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-003', 4, 'Monthly Service Charge', 450.00, '2026-03-31', 'Paid'),
  ('BILL-2026-03-004', 5, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-005', 6, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-006', 7, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-007', 8, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-008', 9, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-009', 10, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-03-010', 11, 'Monthly Service Charge', 450.00, '2026-03-31', 'Unpaid'),
  ('BILL-2026-02-001', 2, 'Monthly Service Charge', 450.00, '2026-02-28', 'Paid'),
  ('BILL-2026-01-001', 4, 'Parking stall add-on', 35.00, '2026-01-31', 'Paid');

COMMIT;
