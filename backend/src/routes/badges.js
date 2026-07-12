const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM badges ORDER BY xp_required ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/', async (req, res) => {
  const { name, description, xp_required, icon } = req.body;
  if (!name || xp_required === undefined) {
    return res.status(400).json({ error: 'name and xp_required are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO badges (name, description, xp_required, icon) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, description || null, xp_required, icon || '🏅']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

router.get('/employee/:employeeId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, eb.awarded_at
      FROM employee_badges eb
      JOIN badges b ON b.id = eb.badge_id
      WHERE eb.employee_id = $1
      ORDER BY eb.awarded_at DESC
    `, [req.params.employeeId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employee badges' });
  }
});

module.exports = router;