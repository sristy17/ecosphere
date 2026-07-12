const express = require('express');
const router = express.Router();
const db = require('../db'); 

router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    const conds = [];
    const params = [];
    let i = 1;
    if (category) { conds.push(`category = $${i++}`); params.push(category); }
    if (status) { conds.push(`status = $${i++}`); params.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT * FROM emission_factors ${where} ORDER BY category, name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('List emission factors error:', err);
    res.status(500).json({ error: 'Failed to fetch emission factors' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, name, unit, factor_kg_co2_per_unit } = req.body;
    if (!category || !name || !unit || factor_kg_co2_per_unit == null) {
      return res.status(400).json({ error: 'category, name, unit, and factor_kg_co2_per_unit are required' });
    }
    const { rows } = await db.query(
      `INSERT INTO emission_factors (category, name, unit, factor_kg_co2_per_unit)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [category, name, unit, factor_kg_co2_per_unit]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create emission factor error:', err);
    res.status(500).json({ error: 'Failed to create emission factor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, unit, factor_kg_co2_per_unit, status } = req.body;

    const { rows: existingRows } = await db.query('SELECT * FROM emission_factors WHERE id = $1', [id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Emission factor not found' });
    const existing = existingRows[0];

    const { rows } = await db.query(
      `UPDATE emission_factors
       SET category = $1, name = $2, unit = $3, factor_kg_co2_per_unit = $4, status = $5
       WHERE id = $6 RETURNING *`,
      [
        category ?? existing.category,
        name ?? existing.name,
        unit ?? existing.unit,
        factor_kg_co2_per_unit ?? existing.factor_kg_co2_per_unit,
        status ?? existing.status,
        id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update emission factor error:', err);
    res.status(500).json({ error: 'Failed to update emission factor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: usageRows } = await db.query(
      'SELECT COUNT(*) FROM operational_records WHERE emission_factor_id = $1',
      [id]
    );
    if (parseInt(usageRows[0].count, 10) > 0) {
      return res.status(409).json({
        error: 'Cannot delete — this factor is referenced by existing operational records. Deactivate it instead.',
      });
    }
    await db.query('DELETE FROM emission_factors WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Delete emission factor error:', err);
    res.status(500).json({ error: 'Failed to delete emission factor' });
  }
});

module.exports = router;