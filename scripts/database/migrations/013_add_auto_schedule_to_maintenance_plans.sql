-- ========================================
-- Migration 013: Add auto_schedule to maintenance_plans
-- Date: 2026-02-09
-- ========================================

ALTER TABLE maintenance_plans
ADD COLUMN IF NOT EXISTS auto_schedule BOOLEAN DEFAULT TRUE;

UPDATE maintenance_plans
SET auto_schedule = TRUE
WHERE auto_schedule IS NULL;
