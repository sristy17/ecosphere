const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { employee_id, department_id, carbon_kg, source, date } = req.body;

  if (!department_id || carbon_kg === undefined) {
    return res.status(400).json({ error: 'department_id and carbon_kg are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO carbon_transactions (employee_id, department_id, carbon_kg, source, date)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE)) RETURNING *`,
      [employee_id || null, department_id, carbon_kg, source || null, date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log transaction' });
  }
});

router.get('/', async (req, res) => {
  const { department_id } = req.query;
  try {
    const result = department_id
      ? await pool.query('SELECT * FROM carbon_transactions WHERE department_id = $1 ORDER BY date DESC', [department_id])
      : await pool.query('SELECT * FROM carbon_transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/summary/by-department', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, COALESCE(SUM(ct.carbon_kg), 0) AS total_carbon_kg
      FROM departments d
      LEFT JOIN carbon_transactions ct ON ct.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY total_carbon_kg DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;