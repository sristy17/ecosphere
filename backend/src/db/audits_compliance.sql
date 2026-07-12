CREATE TABLE IF NOT EXISTS audits (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  auditor VARCHAR(255),
  audit_date DATE,
  findings TEXT,
  status VARCHAR(50) DEFAULT 'under_review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_issues (
  id SERIAL PRIMARY KEY,
  audit_id INTEGER REFERENCES audits(id),
  severity VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  owner VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
