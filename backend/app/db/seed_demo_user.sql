-- ============================================================
-- Insert demo/dev user for local development
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

INSERT INTO user_profiles (id, email, level, time_budget, style)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@sol.local',
    'beginner',
    'casual',
    'structured'
)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT * FROM user_profiles WHERE id = '00000000-0000-0000-0000-000000000001';
