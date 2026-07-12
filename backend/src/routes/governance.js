const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/policies', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM esg_policies ORDER BY id');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/policies', async (req, res) => {
  const { title, description } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO esg_policies (title, description) VALUES ($1,$2) RETURNING *',
      [title, description || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/policies/:id/acknowledge', async (req, res) => {
  const { employee_id } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO policy_acknowledgements (employee_id, policy_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING RETURNING *`,
      [employee_id, req.params.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/acknowledgements', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT pa.*, u.name AS employee_name, p.title AS policy_title
      FROM policy_acknowledgements pa
      JOIN employees e ON e.id = pa.employee_id
      JOIN users u ON u.id = e.user_id
      JOIN esg_policies p ON p.id = pa.policy_id
      ORDER BY pa.acknowledged_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;