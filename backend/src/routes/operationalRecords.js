const express = require('express');
const router = express.Router();
const db = require('../db'); 

async function isAutoCalcEnabled() {
  const { rows } = await db.query('SELECT auto_emission_calculation FROM esg_configuration LIMIT 1');
  return rows[0]?.auto_emission_calculation === true;
}

async function calculateAndLink(record) {
  const { rows: factorRows } = await db.query('SELECT * FROM emission_factors WHERE id = $1', [
    record.emission_factor_id,
  ]);
  if (!factorRows.length) {
    throw new Error('Linked emission factor not found');
  }
  const factor = factorRows[0];
  const carbonKg = parseFloat(record.quantity) * parseFloat(factor.factor_kg_co2_per_unit);

  const { rows: ctRows } = await db.query(
    `INSERT INTO carbon_transactions (employee_id, department_id, carbon_kg, source, date)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      record.employee_id,
      record.department_id,
      carbonKg.toFixed(2),
      `${record.record_type}: ${factor.name}`,
      record.record_date,
    ]
  );
  const carbonTransaction = ctRows[0];

  const { rows: updatedRows } = await db.query(
    'UPDATE operational_records SET carbon_transaction_id = $1 WHERE id = $2 RETURNING *',
    [carbonTransaction.id, record.id]
  );

  return { record: updatedRows[0], carbon_transaction: carbonTransaction };
}

router.get('/', async (req, res) => {
  try {
    const { record_type, department_id } = req.query;
    const conds = [];
    const params = [];
    let i = 1;
    if (record_type) { conds.push(`orec.record_type = $${i++}`); params.push(record_type); }
    if (department_id) { conds.push(`orec.department_id = $${i++}`); params.push(department_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT orec.*, ef.name AS factor_name, ef.unit AS factor_unit, d.name AS department_name,
              ct.carbon_kg AS calculated_carbon_kg
       FROM operational_records orec
       LEFT JOIN emission_factors ef ON ef.id = orec.emission_factor_id
       LEFT JOIN departments d ON d.id = orec.department_id
       LEFT JOIN carbon_transactions ct ON ct.id = orec.carbon_transaction_id
       ${where}
       ORDER BY orec.record_date DESC, orec.id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('List operational records error:', err);
    res.status(500).json({ error: 'Failed to fetch operational records' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      record_type, department_id, employee_id, emission_factor_id,
      quantity, unit, description, record_date,
    } = req.body;

    if (!record_type || !department_id || quantity == null) {
      return res.status(400).json({ error: 'record_type, department_id, and quantity are required' });
    }

    const { rows: insertedRows } = await db.query(
      `INSERT INTO operational_records
         (record_type, department_id, employee_id, emission_factor_id, quantity, unit, description, record_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE))
       RETURNING *`,
      [record_type, department_id, employee_id || null, emission_factor_id || null,
        quantity, unit || null, description || null, record_date || null]
    );
    let record = insertedRows[0];

    const autoCalcOn = await isAutoCalcEnabled();
    let calculated = false;
    if (autoCalcOn && record.emission_factor_id) {
      const result = await calculateAndLink(record);
      record = result.record;
      calculated = true;
    }

    res.status(201).json({ record, auto_calculated: calculated });
  } catch (err) {
    console.error('Create operational record error:', err);
    res.status(500).json({ error: 'Failed to create operational record' });
  }
});

router.post('/:id/calculate', async (req, res) => {
  try {
    const { id } = req.params;
    const { emission_factor_id } = req.body; 

    const { rows: existingRows } = await db.query('SELECT * FROM operational_records WHERE id = $1', [id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Operational record not found' });
    let record = existingRows[0];

    if (record.carbon_transaction_id) {
      return res.status(409).json({ error: 'This record has already been calculated' });
    }

    if (emission_factor_id) {
      const { rows: updatedRows } = await db.query(
        'UPDATE operational_records SET emission_factor_id = $1 WHERE id = $2 RETURNING *',
        [emission_factor_id, id]
      );
      record = updatedRows[0];
    }

    if (!record.emission_factor_id) {
      return res.status(400).json({ error: 'No emission factor linked — provide emission_factor_id' });
    }

    const result = await calculateAndLink(record);
    res.json(result);
  } catch (err) {
    console.error('Calculate operational record error:', err);
    res.status(500).json({ error: err.message || 'Failed to calculate emissions' });
  }
});

module.exports = router;