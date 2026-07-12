CREATE TABLE IF NOT EXISTS csr_activities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS csr_participation (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  activity_id INTEGER REFERENCES csr_activities(id),
  approval_status VARCHAR(50) DEFAULT 'pending',
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, activity_id)
);

CREATE TABLE IF NOT EXISTS esg_policies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  policy_id INTEGER REFERENCES esg_policies(id),
  acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, policy_id)
);
