-- Hotel Management Database Schema

CREATE DATABASE IF NOT EXISTS hotel_management_db;
USE hotel_management_db;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_number VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    description TEXT,
    capacity INT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    location VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    INDEX idx_room_number (room_number),
    INDEX idx_active (active)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payment_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    guest_access_id VARCHAR(7) UNIQUE,
    check_in_otp VARCHAR(6),
    check_out_otp VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    INDEX idx_room_id (room_id),
    INDEX idx_status (status),
    INDEX idx_check_in (check_in),
    INDEX idx_check_out (check_out),
    INDEX idx_room_status_dates (room_id, status, check_in, check_out),
    INDEX idx_customer_email (customer_email),
    INDEX idx_guest_access_id (guest_access_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id BIGINT NOT NULL UNIQUE,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS booking_otp_audit_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operation VARCHAR(40) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    booking_id_ref VARCHAR(32) NOT NULL,
    guest_id_mask VARCHAR(16) NOT NULL,
    success BOOLEAN NOT NULL,
    detail VARCHAR(500) NOT NULL,
    INDEX idx_booking_otp_audit_ts (occurred_at),
    INDEX idx_booking_otp_audit_operation (operation),
    INDEX idx_booking_otp_audit_actor (actor)
);

-- Insert sample data
INSERT IGNORE INTO admins (email, password, name) VALUES 
('admin@hotel.com', '$2a$10$sGV/R3FMOVvP0DAEsRxjNOc/sqCQHFWOvd2LQiBGrcoNFG3B8QJnG', 'Admin User');

UPDATE admins
SET password = '$2a$10$sGV/R3FMOVvP0DAEsRxjNOc/sqCQHFWOvd2LQiBGrcoNFG3B8QJnG'
WHERE email = 'admin@hotel.com';

INSERT IGNORE INTO rooms (room_number, type, price_per_night, description, capacity, active, location) VALUES
('101', 'SINGLE', 2500, 'Comfortable single room with modern amenities', 1, TRUE, 'Unknown'),
('102', 'DOUBLE', 4000, 'Spacious double room with city view', 2, TRUE, 'Unknown'),
('201', 'SUITE', 6000, 'Luxury suite with living area', 3, TRUE, 'Unknown'),
('202', 'DELUXE', 5000, 'Deluxe room with premium features', 2, TRUE, 'Unknown'),
('301', 'DOUBLE', 4500, 'Double room with balcony', 2, TRUE, 'Unknown'),
('302', 'SUITE', 7000, 'Executive suite with full facilities', 4, TRUE, 'Unknown');

-- Demo bookings for admin dashboard and analytics
INSERT INTO bookings (
        room_id, customer_name, customer_phone, customer_email,
        check_in, check_out, total_amount, status, payment_id, payment_status
)
SELECT r.id, 'Demo Checkin Guest', '9876543201', 'demo.checkin@example.com',
             '2026-04-15', '2026-04-19', 10000, 'CHECKED_IN', 'pay_demo_checkin_1001', 'PAID'
FROM rooms r
WHERE r.room_number = '101'
    AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.customer_email = 'demo.checkin@example.com'
                AND b.check_in = '2026-04-15'
    );

INSERT INTO bookings (
        room_id, customer_name, customer_phone, customer_email,
        check_in, check_out, total_amount, status, payment_id, payment_status
)
SELECT r.id, 'Demo Future Guest', '9876543202', 'demo.future@example.com',
             '2026-04-25', '2026-04-28', 12000, 'CONFIRMED', 'pay_demo_future_1002', 'PAID'
FROM rooms r
WHERE r.room_number = '102'
    AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.customer_email = 'demo.future@example.com'
                AND b.check_in = '2026-04-25'
    );

INSERT INTO bookings (
        room_id, customer_name, customer_phone, customer_email,
        check_in, check_out, total_amount, status, payment_id, payment_status
)
SELECT r.id, 'Demo Checkout Guest', '9876543203', 'demo.checkout@example.com',
             '2026-04-01', '2026-04-04', 18000, 'CHECKED_OUT', 'pay_demo_checkout_1003', 'PAID'
FROM rooms r
WHERE r.room_number = '201'
    AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.customer_email = 'demo.checkout@example.com'
                AND b.check_in = '2026-04-01'
    );

-- Demo payment records
INSERT IGNORE INTO payments (
        booking_id, transaction_id, status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature
)
SELECT b.id, 'txn_demo_1001', 'SUCCESS',
             'order_demo_1001', 'pay_demo_checkin_1001', 'sig_demo_1001'
FROM bookings b
WHERE b.customer_email = 'demo.checkin@example.com'
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.transaction_id = 'txn_demo_1001');

INSERT IGNORE INTO payments (
        booking_id, transaction_id, status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature
)
SELECT b.id, 'txn_demo_1002', 'SUCCESS',
             'order_demo_1002', 'pay_demo_future_1002', 'sig_demo_1002'
FROM bookings b
WHERE b.customer_email = 'demo.future@example.com'
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.transaction_id = 'txn_demo_1002');

INSERT IGNORE INTO payments (
        booking_id, transaction_id, status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature
)
SELECT b.id, 'txn_demo_1003', 'SUCCESS',
             'order_demo_1003', 'pay_demo_checkout_1003', 'sig_demo_1003'
FROM bookings b
WHERE b.customer_email = 'demo.checkout@example.com'
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.transaction_id = 'txn_demo_1003');
