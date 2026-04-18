-- Adds indexes that improve payment lookup and booking history sorting.
-- Safe for repeat runs on MySQL 8+: each index is created only if missing.

USE hotel_management_db;

-- bookings(customer_email, created_at) supports findByCustomerEmailOrderByCreatedAtDesc
SET @idx_booking_history_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'bookings'
      AND index_name = 'idx_customer_email_created_at'
);

SET @ddl_booking_history := IF(
    @idx_booking_history_exists = 0,
    'ALTER TABLE bookings ADD INDEX idx_customer_email_created_at (customer_email, created_at)',
    'SELECT ''Index idx_customer_email_created_at already exists'' AS message'
);

PREPARE stmt_booking_history FROM @ddl_booking_history;
EXECUTE stmt_booking_history;
DEALLOCATE PREPARE stmt_booking_history;

-- payments(razorpay_payment_id) supports findByRazorpayPaymentId
SET @idx_razorpay_payment_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'payments'
      AND index_name = 'idx_razorpay_payment_id'
);

SET @ddl_razorpay_payment := IF(
    @idx_razorpay_payment_exists = 0,
    'ALTER TABLE payments ADD INDEX idx_razorpay_payment_id (razorpay_payment_id)',
    'SELECT ''Index idx_razorpay_payment_id already exists'' AS message'
);

PREPARE stmt_razorpay_payment FROM @ddl_razorpay_payment;
EXECUTE stmt_razorpay_payment;
DEALLOCATE PREPARE stmt_razorpay_payment;

-- payments(razorpay_order_id) supports findByRazorpayOrderId
SET @idx_razorpay_order_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'payments'
      AND index_name = 'idx_razorpay_order_id'
);

SET @ddl_razorpay_order := IF(
    @idx_razorpay_order_exists = 0,
    'ALTER TABLE payments ADD INDEX idx_razorpay_order_id (razorpay_order_id)',
    'SELECT ''Index idx_razorpay_order_id already exists'' AS message'
);

PREPARE stmt_razorpay_order FROM @ddl_razorpay_order;
EXECUTE stmt_razorpay_order;
DEALLOCATE PREPARE stmt_razorpay_order;
