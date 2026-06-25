-- ============================================================
-- Migration: add is_core & depends_on to modules
-- Run in Supabase SQL Editor after base schema
-- ============================================================

ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT TRUE;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS depends_on UUID[] DEFAULT '{}';
