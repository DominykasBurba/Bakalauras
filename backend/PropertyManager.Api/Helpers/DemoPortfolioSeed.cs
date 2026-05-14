namespace PropertyManager.Api.Helpers;

public static class DemoPortfolioSeed
{
    public static readonly string[] SqlStatements =
    [
        """
        INSERT INTO units (building_id, unit_code, floor, area_sqm, notes, photo_urls) VALUES
        (1, '101', '1', 55.00, 'Studio wing', '[]'::jsonb),
        (1, '102', '1', 52.00, NULL, '[]'::jsonb),
        (1, '118', '1', 60.00, NULL, '[]'::jsonb),
        (1, '204', '2', 72.50, 'Corner', '[]'::jsonb),
        (1, '205', '2', 68.00, NULL, '[]'::jsonb),
        (1, '312', '3', 74.00, NULL, '[]'::jsonb),
        (1, '408', '4', 90.00, 'Penthouse floor', '[]'::jsonb),
        (2, '101', '1', 48.00, NULL, '[]'::jsonb),
        (2, '108', '1', 52.00, NULL, '[]'::jsonb),
        (2, '215', '2', 65.00, NULL, '[]'::jsonb),
        (2, '300', '3', 70.00, NULL, '[]'::jsonb),
        (3, '101', '1', 50.00, NULL, '[]'::jsonb),
        (3, '402', '4', 78.00, NULL, '[]'::jsonb),
        (3, '405', '4', 76.00, NULL, '[]'::jsonb),
        (3, '505', '5', 82.00, NULL, '[]'::jsonb),
        (4, '102', '1', 58.00, NULL, '[]'::jsonb),
        (4, '220', '2', 64.00, NULL, '[]'::jsonb),
        (4, '331', '3', 71.00, NULL, '[]'::jsonb),
        (5, 'PH1', 'PH', 120.00, 'Penthouse', '[]'::jsonb),
        (5, 'PH2', 'PH', 115.00, NULL, '[]'::jsonb),
        (5, '1200', '12', 88.00, NULL, '[]'::jsonb),
        (6, 'A1', '1', 45.00, NULL, '[]'::jsonb),
        (6, 'A2', '1', 45.00, NULL, '[]'::jsonb),
        (6, 'B1', '2', 52.00, NULL, '[]'::jsonb),
        (7, 'A1', '1', 48.00, NULL, '[]'::jsonb),
        (7, 'A2', '1', 48.00, NULL, '[]'::jsonb),
        (7, 'B1', '2', 55.00, NULL, '[]'::jsonb),
        (8, 'A1', '1', 46.00, NULL, '[]'::jsonb),
        (8, 'A2', '1', 46.00, NULL, '[]'::jsonb),
        (8, 'B1', '2', 54.00, NULL, '[]'::jsonb),
        (9, 'A1', '1', 50.00, NULL, '[]'::jsonb),
        (9, 'A2', '1', 50.00, NULL, '[]'::jsonb),
        (9, 'B1', '2', 58.00, NULL, '[]'::jsonb),
        (10, 'A1', '1', 52.00, NULL, '[]'::jsonb),
        (10, 'A2', '1', 52.00, NULL, '[]'::jsonb),
        (10, 'B1', '2', 60.00, NULL, '[]'::jsonb),
        (10, 'C1', '3', 68.00, NULL, '[]'::jsonb),
        (11, 'A1', '1', 44.00, NULL, '[]'::jsonb),
        (11, 'A2', '1', 44.00, NULL, '[]'::jsonb),
        (12, 'A1', '1', 49.00, NULL, '[]'::jsonb),
        (12, 'A2', '1', 49.00, NULL, '[]'::jsonb),
        (12, 'B1', '2', 56.00, NULL, '[]'::jsonb),
        (12, 'B2', '2', 56.00, NULL, '[]'::jsonb)
        ON CONFLICT (building_id, unit_code) DO NOTHING;
        """,

        """
        INSERT INTO units (building_id, unit_code, floor, area_sqm, notes, photo_urls) VALUES
        (1, '103', '1', 54.00, 'Vacant demo', '[]'::jsonb),
        (1, '206', '2', 70.00, NULL, '[]'::jsonb),
        (1, '310', '3', 73.00, NULL, '[]'::jsonb),
        (1, '407', '4', 85.00, NULL, '[]'::jsonb),
        (2, '109', '1', 51.00, NULL, '[]'::jsonb),
        (2, '216', '2', 66.00, NULL, '[]'::jsonb),
        (2, '301', '3', 69.00, NULL, '[]'::jsonb),
        (3, '103', '1', 51.00, NULL, '[]'::jsonb),
        (3, '403', '4', 77.00, NULL, '[]'::jsonb),
        (3, '506', '5', 80.00, NULL, '[]'::jsonb),
        (4, '103', '1', 59.00, NULL, '[]'::jsonb),
        (4, '223', '2', 63.00, NULL, '[]'::jsonb),
        (4, '440', '4', 75.00, NULL, '[]'::jsonb),
        (5, 'PH3', 'PH', 118.00, NULL, '[]'::jsonb),
        (5, '1101', '11', 86.00, NULL, '[]'::jsonb),
        (6, 'A3', '1', 46.00, NULL, '[]'::jsonb),
        (6, 'B2', '2', 53.00, NULL, '[]'::jsonb),
        (7, 'B2', '2', 54.00, NULL, '[]'::jsonb),
        (8, 'B2', '2', 53.00, NULL, '[]'::jsonb),
        (9, 'B2', '2', 57.00, NULL, '[]'::jsonb),
        (10, 'C2', '3', 67.00, NULL, '[]'::jsonb),
        (11, 'B1', '2', 50.00, NULL, '[]'::jsonb),
        (12, 'C1', '3', 60.00, NULL, '[]'::jsonb)
        ON CONFLICT (building_id, unit_code) DO NOTHING;
        """,

        """
        INSERT INTO building_images (building_id, image_url, caption, sort_order)
        SELECT b.id, 'https://picsum.photos/seed/pm' || b.id || 'a/960/540', 'Exterior', 0
        FROM buildings b WHERE NOT EXISTS (SELECT 1 FROM building_images i WHERE i.building_id = b.id AND i.sort_order = 0);
        """,
        """
        INSERT INTO building_images (building_id, image_url, caption, sort_order)
        SELECT b.id, 'https://picsum.photos/seed/pm' || b.id || 'b/960/540', 'Common area', 1
        FROM buildings b WHERE NOT EXISTS (SELECT 1 FROM building_images i WHERE i.building_id = b.id AND i.sort_order = 1);
        """,

        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 2, '2022-06-01', '2024-11-30'
        FROM units u WHERE u.building_id = 1 AND u.unit_code = '101'
        AND NOT EXISTS (
          SELECT 1 FROM occupancies o
          WHERE o.unit_id = u.id AND o.user_id = 2 AND o.started_at = DATE '2022-06-01');
        """,

        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 2, '2025-01-10', NULL FROM units u WHERE u.building_id = 1 AND u.unit_code = '204'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 2 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 3, '2024-08-01', NULL FROM units u WHERE u.building_id = 1 AND u.unit_code = '312'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 3 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 4, '2025-02-01', NULL FROM units u WHERE u.building_id = 2 AND u.unit_code = '108'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 4 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 5, '2024-11-15', NULL FROM units u WHERE u.building_id = 2 AND u.unit_code = '215'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 5 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 6, '2025-01-20', NULL FROM units u WHERE u.building_id = 3 AND u.unit_code = '402'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 6 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 7, '2024-09-01', NULL FROM units u WHERE u.building_id = 3 AND u.unit_code = '505'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 7 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 8, '2025-03-01', NULL FROM units u WHERE u.building_id = 1 AND u.unit_code = '118'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 8 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 9, '2024-12-01', NULL FROM units u WHERE u.building_id = 4 AND u.unit_code = '220'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 9 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 10, '2025-02-10', NULL FROM units u WHERE u.building_id = 4 AND u.unit_code = '331'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 10 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 11, '2024-07-01', NULL FROM units u WHERE u.building_id = 5 AND u.unit_code = 'PH1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 11 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 17, '2025-02-01', NULL FROM units u WHERE u.building_id = 6 AND u.unit_code = 'A1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 17 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 18, '2024-12-01', NULL FROM units u WHERE u.building_id = 7 AND u.unit_code = 'A1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 18 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 19, '2025-01-15', NULL FROM units u WHERE u.building_id = 8 AND u.unit_code = 'B1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 19 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 20, '2025-03-05', NULL FROM units u WHERE u.building_id = 9 AND u.unit_code = 'A2'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 20 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 21, '2024-10-01', NULL FROM units u WHERE u.building_id = 10 AND u.unit_code = 'A1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 21 AND o.ended_at IS NULL);
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 22, '2025-02-20', NULL FROM units u WHERE u.building_id = 11 AND u.unit_code = 'A1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.ended_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.user_id = 22 AND o.ended_at IS NULL);
        """,

        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 1 AND uu.unit_code = '204'
        ) s WHERE u.id = 2;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 1 AND uu.unit_code = '312'
        ) s WHERE u.id = 3;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 2 AND uu.unit_code = '108'
        ) s WHERE u.id = 4;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 2 AND uu.unit_code = '215'
        ) s WHERE u.id = 5;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 3 AND uu.unit_code = '402'
        ) s WHERE u.id = 6;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 3 AND uu.unit_code = '505'
        ) s WHERE u.id = 7;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 1 AND uu.unit_code = '118'
        ) s WHERE u.id = 8;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 4 AND uu.unit_code = '220'
        ) s WHERE u.id = 9;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 4 AND uu.unit_code = '331'
        ) s WHERE u.id = 10;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 5 AND uu.unit_code = 'PH1'
        ) s WHERE u.id = 11;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 6 AND uu.unit_code = 'A1'
        ) s WHERE u.id = 17;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 7 AND uu.unit_code = 'A1'
        ) s WHERE u.id = 18;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 8 AND uu.unit_code = 'B1'
        ) s WHERE u.id = 19;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 9 AND uu.unit_code = 'A2'
        ) s WHERE u.id = 20;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 10 AND uu.unit_code = 'A1'
        ) s WHERE u.id = 21;
        """,
        """
        UPDATE users u SET unit_id = s.uid, unit = s.label, building_id = s.bid
        FROM (
          SELECT uu.id AS uid, b.id AS bid, b.name || ', Unit ' || uu.unit_code AS label
          FROM units uu JOIN buildings b ON b.id = uu.building_id WHERE uu.building_id = 11 AND uu.unit_code = 'A1'
        ) s WHERE u.id = 22;
        """,

        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 3, '2024-01-01', '2024-07-31' FROM units u WHERE u.building_id = 1 AND u.unit_code = '205'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 3 AND o.started_at = DATE '2024-01-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 4, '2022-09-01', '2023-02-28' FROM units u WHERE u.building_id = 2 AND u.unit_code = '101'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 4 AND o.started_at = DATE '2022-09-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 5, '2023-06-01', '2024-10-31' FROM units u WHERE u.building_id = 2 AND u.unit_code = '300'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 5 AND o.started_at = DATE '2023-06-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 6, '2024-03-01', '2024-12-31' FROM units u WHERE u.building_id = 3 AND u.unit_code = '405'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 6 AND o.started_at = DATE '2024-03-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 7, '2023-01-15', '2024-08-31' FROM units u WHERE u.building_id = 3 AND u.unit_code = '101'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 7 AND o.started_at = DATE '2023-01-15');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 8, '2024-04-01', '2025-02-28' FROM units u WHERE u.building_id = 1 AND u.unit_code = '102'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 8 AND o.started_at = DATE '2024-04-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 9, '2023-11-01', '2024-11-30' FROM units u WHERE u.building_id = 4 AND u.unit_code = '102'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 9 AND o.started_at = DATE '2023-11-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 10, '2024-06-01', '2025-01-31' FROM units u WHERE u.building_id = 4 AND u.unit_code = '223'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 10 AND o.started_at = DATE '2024-06-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 11, '2023-08-01', '2024-06-30' FROM units u WHERE u.building_id = 5 AND u.unit_code = '1200'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 11 AND o.started_at = DATE '2023-08-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 2, '2024-02-01', '2024-12-15' FROM units u WHERE u.building_id = 6 AND u.unit_code = 'A2'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 2 AND o.started_at = DATE '2024-02-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 3, '2023-05-01', '2023-12-31' FROM units u WHERE u.building_id = 7 AND u.unit_code = 'B1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 3 AND o.started_at = DATE '2023-05-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 4, '2024-01-10', '2024-09-30' FROM units u WHERE u.building_id = 8 AND u.unit_code = 'A2'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 4 AND o.started_at = DATE '2024-01-10');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 5, '2024-07-01', '2024-10-31' FROM units u WHERE u.building_id = 9 AND u.unit_code = 'B2'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 5 AND o.started_at = DATE '2024-07-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 6, '2023-09-01', '2024-08-31' FROM units u WHERE u.building_id = 10 AND u.unit_code = 'A2'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 6 AND o.started_at = DATE '2023-09-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 17, '2023-02-01', '2024-05-31' FROM units u WHERE u.building_id = 11 AND u.unit_code = 'B1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 17 AND o.started_at = DATE '2023-02-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 20, '2024-08-01', '2025-02-28' FROM units u WHERE u.building_id = 12 AND u.unit_code = 'B1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 20 AND o.started_at = DATE '2024-08-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 17, '2024-06-01', '2024-12-31' FROM units u WHERE u.building_id = 6 AND u.unit_code = 'B1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 17 AND o.started_at = DATE '2024-06-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 18, '2023-10-01', '2024-11-30' FROM units u WHERE u.building_id = 7 AND u.unit_code = 'A2'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 18 AND o.started_at = DATE '2023-10-01');
        """,
        """
        INSERT INTO occupancies (unit_id, user_id, started_at, ended_at)
        SELECT u.id, 19, '2024-02-15', '2024-12-20' FROM units u WHERE u.building_id = 8 AND u.unit_code = 'A1'
        AND NOT EXISTS (SELECT 1 FROM occupancies o WHERE o.unit_id = u.id AND o.user_id = 19 AND o.started_at = DATE '2024-02-15');
        """,

        """
        INSERT INTO maintenance_requests (id, created_by_user_id, building_id, title, description, status, priority, date_created, assigned_technician, photo_urls) VALUES
        ('REQ-013', 9, 4, 'Thermostat calibration', 'Living room reads 4°F high.', 'Requested', 'Low', '2026-03-18', 'Not assigned', '[]'::jsonb),
        ('REQ-014', 10, 4, 'Balcony screen tear', 'Pet damage — replace mesh.', 'In Progress', 'Medium', '2026-03-19', 'John Smith', '[]'::jsonb),
        ('REQ-015', 11, 5, 'Elevator noise', 'Grinding sound between floors 8–9.', 'Registered', 'High', '2026-03-20', 'Maria Garcia', '[]'::jsonb),
        ('REQ-016', 2, 6, 'Mailbox key copy', 'Need second key for unit A1.', 'Registered', 'Low', '2026-03-21', 'Not assigned', '[]'::jsonb),
        ('REQ-017', 3, 7, 'Fitness room TV', 'HDMI input not detected.', 'In Progress', 'Low', '2026-03-15', 'David Lee', '[]'::jsonb),
        ('REQ-018', 4, 8, 'Sprinkler inspection tag', 'Annual tag expired on floor 3.', 'Registered', 'Medium', '2026-03-22', 'Not assigned', '[]'::jsonb)
        ON CONFLICT (id) DO NOTHING;
        """,

        """
        INSERT INTO technician_profiles (user_id, company_name, contractor_type, updated_at)
        SELECT 12, 'Apex Plumbing & HVAC', 'vendor_company', NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM technician_profiles WHERE user_id = 12);
        """,
        """
        INSERT INTO technician_profiles (user_id, company_name, contractor_type, updated_at)
        SELECT 13, 'Metro Climate Services', 'vendor_company', NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM technician_profiles WHERE user_id = 13);
        """,
        """
        INSERT INTO technician_profiles (user_id, company_name, contractor_type, updated_at)
        SELECT 14, 'Lee Electric & Low Voltage', 'independent_contractor', NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM technician_profiles WHERE user_id = 14);
        """,
        """
        INSERT INTO technician_profiles (user_id, company_name, contractor_type, updated_at)
        SELECT 15, 'Rivera Handyman Co.', 'vendor_company', NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM technician_profiles WHERE user_id = 15);
        """,
        """
        INSERT INTO technician_profiles (user_id, company_name, contractor_type, updated_at)
        SELECT 16, 'Kim Facilities Group', 'vendor_company', NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM technician_profiles WHERE user_id = 16);
        """,

        """
        INSERT INTO service_catalog_items (name, description, sort_order, created_at)
        SELECT 'Plumbing', 'Water supply, drains, fixtures, leaks', 10, NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM service_catalog_items WHERE name = 'Plumbing');
        """,
        """
        INSERT INTO service_catalog_items (name, description, sort_order, created_at)
        SELECT 'HVAC', 'Heating, ventilation, and air conditioning', 20, NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM service_catalog_items WHERE name = 'HVAC');
        """,
        """
        INSERT INTO service_catalog_items (name, description, sort_order, created_at)
        SELECT 'Electrical', 'Power, panels, lighting, low voltage', 30, NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM service_catalog_items WHERE name = 'Electrical');
        """,
        """
        INSERT INTO service_catalog_items (name, description, sort_order, created_at)
        SELECT 'Carpentry', 'Doors, trim, cabinets, wood repairs', 40, NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM service_catalog_items WHERE name = 'Carpentry');
        """,
        """
        INSERT INTO service_catalog_items (name, description, sort_order, created_at)
        SELECT 'General maintenance', 'Minor repairs, touch-ups, common areas', 50, NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM service_catalog_items WHERE name = 'General maintenance');
        """,
        """
        INSERT INTO service_catalog_items (name, description, sort_order, created_at)
        SELECT 'Locksmith', 'Keys, locks, access hardware', 60, NOW() AT TIME ZONE 'utc'
        WHERE NOT EXISTS (SELECT 1 FROM service_catalog_items WHERE name = 'Locksmith');
        """,

        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 12, c.id FROM service_catalog_items c WHERE c.name = 'Plumbing' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 12, c.id FROM service_catalog_items c WHERE c.name = 'HVAC' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 13, c.id FROM service_catalog_items c WHERE c.name = 'HVAC' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 13, c.id FROM service_catalog_items c WHERE c.name = 'Electrical' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 14, c.id FROM service_catalog_items c WHERE c.name = 'Electrical' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 14, c.id FROM service_catalog_items c WHERE c.name = 'Carpentry' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 15, c.id FROM service_catalog_items c WHERE c.name = 'General maintenance' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 15, c.id FROM service_catalog_items c WHERE c.name = 'Locksmith' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 16, c.id FROM service_catalog_items c WHERE c.name = 'Plumbing' ON CONFLICT DO NOTHING;
        """,
        """
        INSERT INTO technician_service_catalog_links (user_id, catalog_item_id)
        SELECT 16, c.id FROM service_catalog_items c WHERE c.name = 'General maintenance' ON CONFLICT DO NOTHING;
        """,

        """
        INSERT INTO scheduled_maintenance (building_id, title, description, scheduled_date, time_window)
        SELECT v.building_id, v.title, v.description, v.scheduled_date, v.time_window
        FROM (VALUES
          (1, 'Elevator rope inspection — Cab 3', 'Certified vendor; one cab may skip-stop briefly.', DATE '2026-04-02', '8 AM – 12 PM'),
          (1, 'Cooling tower chemical treatment', 'Possible brief HVAC hum near mechanical rooms.', DATE '2026-04-09', '9 AM – 3 PM'),
          (2, 'Garage CO sensor calibration', 'Rolling lane closures in P2 west.', DATE '2026-04-04', '10 PM – 4 AM'),
          (2, 'Trash compactor hydraulic service', 'Odors possible during vent cycling.', DATE '2026-04-11', '6 AM – 10 AM'),
          (3, 'Domestic hot water legionella flush', 'Short runs of warm water expected.', DATE '2026-04-07', '5 AM – 7 AM'),
          (3, 'Rooftop guardrail torque check', 'Ladder access on setback B.', DATE '2026-04-14', '8 AM – 2 PM'),
          (4, 'Sprinkler standpipe flow test', 'Alarm bells in stairwells — drill notices posted.', DATE '2026-04-16', '9 AM – 11 AM'),
          (4, 'Balcony drain camera scope', 'Spot checks — balcony access for two units.', DATE '2026-04-22', '10 AM – 4 PM'),
          (5, 'Generator load bank test', 'Brief transfer switch exercises; elevators on backup briefly.', DATE '2026-04-05', '11 PM – 3 AM'),
          (5, 'Helipad obstruction survey', 'Drone flight — cordon on roof 15 min.', DATE '2026-04-18', '7 AM – 8 AM'),
          (6, 'Organic waste tote deep clean', 'Courtyard odor possible for 2 hours.', DATE '2026-04-03', '11 AM – 1 PM'),
          (6, 'Courtyard irrigation startup', 'Walkways briefly wet.', DATE '2026-04-19', '4 AM – 6 AM'),
          (7, 'Steam PRV valve exercise', 'Radiators may hiss during test.', DATE '2026-04-08', '1 PM – 3 PM'),
          (7, 'Historic lobby chandelier lift', 'Escalator bypass — perimeter signage.', DATE '2026-04-25', '10 AM – 2 PM'),
          (8, 'Lobby piano humidity check', 'Quiet tuning spikes in afternoon.', DATE '2026-04-06', '2 PM – 4 PM'),
          (8, 'Façade anchor pull tests', 'Swing stage on Oak face — sidewalk lane shift.', DATE '2026-04-20', '7 AM – 5 PM'),
          (9, 'Loading dock leveler cycle test', 'Backup beepers active in dock.', DATE '2026-04-10', '8 AM – 12 PM'),
          (9, 'Industrial fan belt replacement', 'Short ventilation pause in corridor 2.', DATE '2026-04-17', '6 AM – 9 AM'),
          (10, 'Fountain pump VFD programming', 'Water feature off 4 hours.', DATE '2026-04-12', '9 AM – 1 PM'),
          (10, 'Courtyard hawk nesting survey', 'Ornithologist access — minimal noise.', DATE '2026-04-26', '7 AM – 9 AM'),
          (11, 'Lake path LED controller update', 'Brief walkway segment dark during flash.', DATE '2026-04-13', '11 PM – 12 AM'),
          (11, 'Dock storage kayak rack bolt check', 'Seasonal prep.', DATE '2026-04-21', '9 AM – 11 AM'),
          (12, 'Transit kiosk cache purge', 'Screens reboot twice.', DATE '2026-04-15', '2 AM – 3 AM'),
          (12, 'Platform-facing sealant touch-ups', 'Lift on plaza — alternate entrance.', DATE '2026-04-23', '8 AM – 4 PM')
        ) AS v(building_id, title, description, scheduled_date, time_window)
        WHERE NOT EXISTS (
          SELECT 1 FROM scheduled_maintenance sm
          WHERE sm.building_id = v.building_id AND sm.title = v.title AND sm.scheduled_date = v.scheduled_date);
        """,
    ];
}
