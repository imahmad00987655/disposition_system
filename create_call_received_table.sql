-- Create table for storing call received times
-- This table tracks when calls are received and which complaints are associated

CREATE TABLE IF NOT EXISTS call_received_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id VARCHAR(50) DEFAULT NULL COMMENT 'Complaint number (CmpNo) or Order ID - NULL for non-complaint popups',
    phone_number VARCHAR(20) NOT NULL COMMENT 'Phone number of the caller',
    call_received_time DATETIME NOT NULL COMMENT 'Exact time when call was received',
    event_type VARCHAR(50) DEFAULT 'ring' COMMENT 'Type of call event (ring, answer, customer_data, dds_data, order_data, new_customer)',
    agent_name VARCHAR(255) DEFAULT NULL COMMENT 'Agent who received the call',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    INDEX idx_complaint_id (complaint_id),
    INDEX idx_phone_number (phone_number),
    INDEX idx_call_received_time (call_received_time),
    INDEX idx_created_at (created_at),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs of all incoming calls and popup opens with complaint/order associations';

