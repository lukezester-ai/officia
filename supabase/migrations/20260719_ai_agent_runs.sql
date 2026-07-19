-- Lightweight AI pipeline run tracking (Officia 1.5 orchestration)
CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  pipeline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  current_step TEXT,
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  source_type TEXT,
  source_id TEXT,
  summary TEXT,
  meta_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_tenant ON ai_agent_runs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_correlation ON ai_agent_runs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_status ON ai_agent_runs (status);
