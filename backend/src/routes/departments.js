const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, p.name AS parent_department_name,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) AS employee_count
      FROM departments d
      LEFT JOIN departments p ON p.id = d.parent_department_id
      ORDER BY d.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, p.name AS parent_department_name,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) AS employee_count
      FROM departments d
      LEFT JOIN departments p ON p.id = d.parent_department_id
      WHERE d.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

router.post('/', async (req, res) => {
  const { name, code, head_id, parent_department_id, status } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO departments (name, code, head_id, parent_department_id, status)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'active')) RETURNING *`,
      [name, code || null, head_id || null, parent_department_id || null, status || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, code, head_id, parent_department_id, status } = req.body;
  if (parent_department_id && String(parent_department_id) === req.params.id) {
    return res.status(400).json({ error: 'A department cannot be its own parent' });
  }
  try {
    const result = await pool.query(
      `UPDATE departments SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        head_id = COALESCE($3, head_id),
        parent_department_id = COALESCE($4, parent_department_id),
        status = COALESCE($5, status)
       WHERE id = $6 RETURNING *`,
      [name, code, head_id, parent_department_id, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    // Foreign key violation: department still referenced by employees, child depts, etc.
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete: department is still referenced by employees or other records. Set status to inactive instead.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

router.post('/:id/target', async (req, res) => {
  const { target_kg } = req.body;
  if (target_kg === undefined) return res.status(400).json({ error: 'target_kg required' });
  try {
    const result = await pool.query(`
      INSERT INTO environmental_scores (department_id, target_kg, total_carbon_kg, score)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (department_id) DO UPDATE SET target_kg = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.params.id, target_kg]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set target' });
  }
});

module.exports = router;