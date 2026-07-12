ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_id INTEGER REFERENCES departments(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('csr_activity', 'challenge')),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esg_configuration (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auto_emission_calculation BOOLEAN DEFAULT FALSE,
  evidence_requirement BOOLEAN DEFAULT FALSE,
  badge_auto_award BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO esg_configuration (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_settings (
  type VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE
);
INSERT INTO notification_settings (type, enabled) VALUES
  ('compliance_issue_raised', TRUE),
  ('compliance_overdue', TRUE),
  ('csr_approved', TRUE),
  ('csr_rejected', TRUE),
  ('challenge_completed', TRUE),
  ('badge_unlocked', TRUE),
  ('reward_redeemed', TRUE),
  ('policy_ack_reminder', TRUE)
ON CONFLICT (type) DO NOTHING;