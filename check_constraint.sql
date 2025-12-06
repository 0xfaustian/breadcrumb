-- Check if the unique constraint exists on daily_records table
-- Run this in your Supabase SQL Editor

-- Method 1: List all constraints on daily_records table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'daily_records'::regclass
ORDER BY contype, conname;

-- Method 2: Specifically check for unique constraints
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'daily_records'::regclass
AND contype = 'u';

-- Method 3: Check for the specific unique constraint on (user_id, activity_marker_id, date)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'daily_records'::regclass
AND contype = 'u'
AND pg_get_constraintdef(oid) LIKE '%user_id%'
AND pg_get_constraintdef(oid) LIKE '%activity_marker_id%'
AND pg_get_constraintdef(oid) LIKE '%date%';

