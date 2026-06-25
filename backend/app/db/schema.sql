-- ============================================================
-- Side Quest System of Life – Supabase Schema
-- Run this in the Supabase SQL Editor to bootstrap tables.
-- ============================================================

-- 1. User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    level       TEXT DEFAULT 'beginner',
    time_budget TEXT DEFAULT 'casual',
    style       TEXT DEFAULT 'structured',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Learning pathways
CREATE TABLE IF NOT EXISTS pathways (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    slug        TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    title       TEXT NOT NULL,
    subject     TEXT NOT NULL,
    goal_level  TEXT NOT NULL,
    duration    TEXT NOT NULL,
    summary     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pathways_slug ON pathways(slug);
CREATE INDEX IF NOT EXISTS idx_pathways_user ON pathways(user_id);

-- 3. Modules within a pathway
CREATE TABLE IF NOT EXISTS modules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pathway_id  UUID REFERENCES pathways(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    sort_order  INT DEFAULT 0,
    is_core     BOOLEAN DEFAULT TRUE,
    depends_on  UUID[] DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_modules_pathway ON modules(pathway_id);

-- 4. Micro-tasks
CREATE TABLE IF NOT EXISTS tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id    UUID REFERENCES modules(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    sort_order   INT DEFAULT 0,
    completed    BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module_id);

-- 5. Daily progress logs (for streak tracking)
CREATE TABLE IF NOT EXISTS progress_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks_done  INT DEFAULT 0,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, log_date)
);

-- 6. Chat conversations
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    pathway_id  UUID REFERENCES pathways(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    agent_name      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- VIEW: quest_summary — used by the homepage gallery
-- ============================================================

CREATE OR REPLACE VIEW quest_summary AS
SELECT
    p.id,
    p.slug,
    p.title,
    p.subject,
    p.goal_level,
    p.duration,
    p.summary,
    p.created_at,
    COALESCE(t.task_counts->>'total', '0')::INT AS total_tasks,
    COALESCE(t.task_counts->>'done', '0')::INT  AS completed_tasks
FROM pathways p
LEFT JOIN LATERAL (
    SELECT
        jsonb_build_object(
            'total', COUNT(tk.id),
            'done',  COUNT(tk.id) FILTER (WHERE tk.completed)
        ) AS task_counts
    FROM modules m
    LEFT JOIN tasks tk ON tk.module_id = m.id
    WHERE m.pathway_id = p.id
) t ON true
ORDER BY p.created_at DESC;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
