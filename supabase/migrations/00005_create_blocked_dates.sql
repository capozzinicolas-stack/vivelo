CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, blocked_date)
);

CREATE INDEX idx_blocked_dates_service ON blocked_dates(service_id);
CREATE INDEX idx_blocked_dates_date ON blocked_dates(blocked_date);
