CREATE TABLE IF NOT EXISTS emission_factors (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL CHECK (category IN ('purchase', 'manufacturing', 'expense', 'fleet')),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  factor_kg_co2_per_unit NUMERIC(12, 6) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operational_records (
  id SERIAL PRIMARY KEY,
  record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('purchase', 'manufacturing', 'expense', 'fleet')),
  department_id INTEGER REFERENCES departments(id),
  employee_id INTEGER REFERENCES employees(id),
  emission_factor_id INTEGER REFERENCES emission_factors(id),
  quantity NUMERIC(12, 2) NOT NULL,
  unit VARCHAR(50),
  description TEXT,
  record_date DATE DEFAULT CURRENT_DATE,
  carbon_transaction_id INTEGER REFERENCES carbon_transactions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_op_records_type ON operational_records(record_type);
CREATE INDEX IF NOT EXISTS idx_op_records_dept ON operational_records(department_id);
CREATE INDEX IF NOT EXISTS idx_op_records_factor ON operational_records(emission_factor_id);

INSERT INTO emission_factors (category, name, unit, factor_kg_co2_per_unit) VALUES
  ('fleet', 'Diesel fuel', 'liter', 2.68),
  ('fleet', 'Petrol fuel', 'liter', 2.31),
  ('purchase', 'Paper (office supplies)', 'kg', 0.94),
  ('manufacturing', 'Steel', 'kg', 1.85),
  ('expense', 'Grid electricity', 'kWh', 0.71)
ON CONFLICT DO NOTHING;