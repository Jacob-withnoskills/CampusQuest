
-- CAMPUS QUEST DATABASE SCHEMA
-- PostgreSQL 18

-- 1. ADMIN ACCOUNTS
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAMS
CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    team_code VARCHAR(20) NOT NULL UNIQUE,
    team_name VARCHAR(100) NOT NULL,
    password_hash TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team
ON team_members(team_id);

-- 4. ROUNDS
CREATE TABLE IF NOT EXISTS rounds (
    id BIGSERIAL PRIMARY KEY,
    round_number SMALLINT NOT NULL UNIQUE
        CHECK (round_number BETWEEN 1 AND 3),
    round_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'LOCKED'
        CHECK (status IN ('LOCKED', 'ACTIVE', 'COMPLETED')),
    qualification_mode VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE'
        CHECK (qualification_mode IN ('PERCENTAGE', 'EXACT')),
    qualification_value NUMERIC(6,2) NOT NULL DEFAULT 50
        CHECK (qualification_value > 0),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
    id BIGSERIAL PRIMARY KEY,
    round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    clue TEXT,
    hint TEXT,
    question TEXT NOT NULL,
    answer_hash TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_round
ON challenges(round_id);

-- 6. QR CHECKPOINTS
CREATE TABLE IF NOT EXISTS qr_checkpoints (
    id BIGSERIAL PRIMARY KEY,
    challenge_id BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    checkpoint_name VARCHAR(100) NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id),
    challenge_id BIGINT NOT NULL REFERENCES challenges(id),
    idempotency_key UUID NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_awarded INTEGER NOT NULL DEFAULT 0
        CHECK (points_awarded >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_submissions_team
ON submissions(team_id);

CREATE INDEX IF NOT EXISTS idx_submissions_challenge
ON submissions(challenge_id);

-- 8. TEAM SCORES
CREATE TABLE IF NOT EXISTS team_scores (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, round_id)
);

-- 9. QUALIFICATIONS
CREATE TABLE IF NOT EXISTS qualifications (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    from_round_id BIGINT NOT NULL REFERENCES rounds(id),
    qualified BOOLEAN NOT NULL DEFAULT FALSE,
    rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, from_round_id)
);

-- 10. ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSERT THE THREE DEFAULT ROUNDS
INSERT INTO rounds (round_number, round_name)
VALUES
    (1, 'Puzzle Hunt'),
    (2, 'Mystery Challenge'),
    (3, 'Ultimate QR Quest')
ON CONFLICT (round_number) DO NOTHING;
