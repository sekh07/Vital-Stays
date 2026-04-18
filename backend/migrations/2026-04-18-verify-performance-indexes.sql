-- Verifies that performance indexes required by room availability, payment lookup,
-- and booking history queries exist in the current database.

USE hotel_management_db;

SELECT
    s.table_name,
    s.index_name,
    GROUP_CONCAT(s.column_name ORDER BY s.seq_in_index SEPARATOR ', ') AS indexed_columns,
    CASE WHEN s.non_unique = 0 THEN 'UNIQUE' ELSE 'NON_UNIQUE' END AS index_type
FROM information_schema.statistics s
WHERE s.table_schema = DATABASE()
  AND (
      (s.table_name = 'bookings' AND s.index_name IN (
          'idx_room_status_dates',
          'idx_customer_email_created_at'
      ))
      OR
      (s.table_name = 'payments' AND s.index_name IN (
          'idx_razorpay_payment_id',
          'idx_razorpay_order_id'
      ))
  )
GROUP BY s.table_name, s.index_name, s.non_unique
ORDER BY s.table_name, s.index_name;

SELECT
    expected.table_name,
    expected.index_name,
    CASE WHEN actual.index_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM (
    SELECT 'bookings' AS table_name, 'idx_room_status_dates' AS index_name
    UNION ALL
    SELECT 'bookings', 'idx_customer_email_created_at'
    UNION ALL
    SELECT 'payments', 'idx_razorpay_payment_id'
    UNION ALL
    SELECT 'payments', 'idx_razorpay_order_id'
) expected
LEFT JOIN (
    SELECT DISTINCT table_name, index_name
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
) actual
    ON actual.table_name = expected.table_name
   AND actual.index_name = expected.index_name
ORDER BY expected.table_name, expected.index_name;
