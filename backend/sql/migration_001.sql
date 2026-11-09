
BEGIN;

-- 1. TEAM AUTHENTICATION
-- Teams retain their existing UUID primary keys.
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. SUBMISSIONS
-- A submission belongs to a team and a challenge.
-- Existing checkpoint references are retained for compatibility.

ALTER TABLE submissions
ALTER COLUMN checkpoint_id DROP NOT NULL;

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS challenge_id BIGINT
REFERENCES challenges(id) ON DELETE CASCADE;

-- There are currently zero submission records, so this can
-- safely be made mandatory for the new challenge-based system.
ALTER TABLE submissions
ALTER COLUMN challenge_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_challenge
ON submissions(challenge_id);

-- 3. TEAM SCORES
CREATE TABLE IF NOT EXISTS team_scores (
    id BIGSERIAL PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0
        CHECK (total_points >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, round_id)
);

-- 4. QUALIFICATIONS
CREATE TABLE IF NOT EXISTS qualifications (
    id BIGSERIAL PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    from_round_id BIGINT NOT NULL REFERENCES rounds(id),
    qualified BOOLEAN NOT NULL DEFAULT FALSE,
    rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, from_round_id)
);

-- 5. QR SCAN RECORDS
-- QR checkpoints retain their existing BIGINT IDs.
CREATE TABLE IF NOT EXISTS qr_scans (
    id BIGSERIAL PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    qr_checkpoint_id BIGINT NOT NULL
        REFERENCES qr_checkpoints(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, qr_checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_team
ON qr_scans(team_id);

-- 6. ADMIN USERNAME UNIQUENESS
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_username_unique
ON admins(username);

COMMIT;
