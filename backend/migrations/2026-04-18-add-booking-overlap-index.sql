-- Adds a composite index used by room availability overlap checks.
-- Safe for repeat runs on MySQL 8+: it only creates the index if missing.

USE hotel_management_db;

SET @idx_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'bookings'
      AND index_name = 'idx_room_status_dates'
);

SET @ddl := IF(
    @idx_exists = 0,
    'ALTER TABLE bookings ADD INDEX idx_room_status_dates (room_id, status, check_in, check_out)',
    'SELECT ''Index idx_room_status_dates already exists'' AS message'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
