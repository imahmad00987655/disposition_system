-- ALTER queries to update call_received_logs table
-- Run these queries to update your existing table
-- Note: Run these one by one. If a column/index already exists, you'll get an error - that's okay, skip that query.

USE callback2;

-- ============================================
-- OPTIONAL: Truncate existing data (if needed)
-- ============================================
-- WARNING: This will DELETE ALL existing data from the table!
-- Only run this if you want to clear all previous call received logs.
-- Uncomment the line below if you want to truncate the table:

-- TRUNCATE TABLE call_received_logs;

-- OR if you want to delete specific records (safer option):
-- DELETE FROM call_received_logs WHERE id > 0;

-- ============================================
-- ALTER Queries (Run these after truncating if needed)
-- ============================================

-- 1. Allow NULL for complaint_id and increase length to accommodate multiple comma-separated IDs
-- This allows NULL values and increases size from VARCHAR(50) to VARCHAR(500)
-- to store multiple IDs like "CMP123,ORD456,DDS789,CUST101"
ALTER TABLE call_received_logs 
MODIFY COLUMN complaint_id VARCHAR(500) DEFAULT NULL COMMENT 'Complaint number (CmpNo), Order ID, DDS ID, Customer ID - comma-separated for merged entries, NULL allowed';

-- 2. Add popup_type column (optional but useful for tracking which popup triggered the entry)
-- If column already exists, you'll get an error - that's fine, just skip this query
ALTER TABLE call_received_logs 
ADD COLUMN popup_type VARCHAR(50) DEFAULT 'call' COMMENT 'Type of popup: call, customer, dds, order, new_customer' AFTER event_type;

-- 3. Add index on event_type for better query performance
-- If index already exists, you'll get an error - that's fine, just skip this query
ALTER TABLE call_received_logs 
ADD INDEX idx_event_type (event_type);

-- 4. Add index on popup_type for filtering
-- If index already exists, you'll get an error - that's fine, just skip this query
ALTER TABLE call_received_logs 
ADD INDEX idx_popup_type (popup_type);

-- Verify the changes
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH, COLUMN_COMMENT
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'callback2' AND TABLE_NAME = 'call_received_logs'
-- ORDER BY ORDINAL_POSITION;

