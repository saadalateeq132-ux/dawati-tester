-- Check what roles are valid
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%role%';

-- Check current users roles
SELECT DISTINCT role FROM users WHERE role IS NOT NULL;
