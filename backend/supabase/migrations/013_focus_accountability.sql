-- Phase F: Focus Contracts + Accountability Contracts

-- Focus blocks (deep work sessions)
CREATE TABLE IF NOT EXISTS focus_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_tasks UUID[] DEFAULT '{}',         -- task IDs planned for this block
  completed_tasks UUID[] DEFAULT '{}',       -- task IDs actually completed
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT NOT NULL DEFAULT 25,  -- planned duration
  focus_score INT,                           -- 0-100 computed after session
  interruptions INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_focus_blocks_user ON focus_blocks(user_id);
CREATE INDEX idx_focus_blocks_started ON focus_blocks(user_id, started_at DESC);

ALTER TABLE focus_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own focus blocks"
  ON focus_blocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Accountability contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('goal', 'habit', 'custom')),
  target_id UUID,                            -- optional link to goal or habit
  commitment TEXT NOT NULL,                  -- what they commit to
  stakes TEXT,                               -- what's at stake (optional)
  stake_amount_cents INT,                    -- monetary stake (optional)
  check_in_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (check_in_frequency IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  progress INT NOT NULL DEFAULT 0,           -- 0-100
  misses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_user ON contracts(user_id);
CREATE INDEX idx_contracts_status ON contracts(user_id, status);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contracts"
  ON contracts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Contract check-ins (daily/weekly tracking)
CREATE TABLE IF NOT EXISTS contract_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  met BOOLEAN NOT NULL,
  auto_tracked BOOLEAN NOT NULL DEFAULT true, -- true = system verified, false = self-report
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, date)
);

CREATE INDEX idx_contract_checkins_contract ON contract_checkins(contract_id);

ALTER TABLE contract_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checkins"
  ON contract_checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
