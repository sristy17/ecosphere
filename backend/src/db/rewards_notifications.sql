CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  reward_id INTEGER REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees need a points/XP balance to redeem against.
-- If employees.total_xp doesn't already exist as a column, this adds it;
-- if XP is tracked elsewhere (e.g. summed from challenge_participation), skip this
-- and tell me where XP currently lives so redemption deducts from the right place.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
