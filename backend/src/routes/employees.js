const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { user_id, department_id, role } = req.body;
  if (!user_id || !department_id) {
    return res.status(400).json({ error: 'user_id and department_id are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO employees (user_id, department_id, role) VALUES ($1, $2, $3) RETURNING *',
      [user_id, department_id, role || 'member']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.role, e.status, u.name, u.email, d.name AS department
      FROM employees e
      JOIN users u ON u.id = e.user_id
      JOIN departments d ON d.id = e.department_id
      ORDER BY e.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.name, e.id AS employee_id, COALESCE(SUM(cp.xp_earned), 0) AS total_xp
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN challenge_participants cp ON cp.employee_id = e.id
      GROUP BY u.name, e.id
      ORDER BY total_xp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;