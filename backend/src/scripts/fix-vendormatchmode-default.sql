-- Fix vendorMatchMode default mismatch
-- SQLite schema default: "substring" (bidirectional, user-friendly)
-- PG schema was: "exact" (strict, different behavior from dev)
-- Now PG schema default is also "substring" to match dev behavior
--
-- This script updates existing rows that have vendorMatchMode = 'exact'
-- to 'substring', since 'exact' was the unintended default from the
-- schema mismatch, not a deliberate user choice.
--
-- Run: psql "$DATABASE_URL" -f src/scripts/fix-vendormatchmode-default.sql
--
-- Safe to re-run: WHERE clause ensures only 'exact' values without user intent are changed.
-- If a user explicitly set 'exact', this preserves that intent IF the row was recently updated.
-- For rows with no user edits (created_at ≈ updated_at), changes default.
-- For rows with user edits (updated_at > created_at), preserves user choice.

-- Update rows where vendorMatchMode is still the schema default 'exact'
-- (i.e., likely never explicitly set by a user)
UPDATE "Policy"
SET vendor_match_mode = 'substring'
WHERE vendor_match_mode = 'exact'
  AND created_at = updated_at;

-- Verify the change
SELECT vendor_match_mode, COUNT(*) as count
FROM "Policy"
GROUP BY vendor_match_mode;