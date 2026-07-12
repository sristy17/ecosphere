const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/activities', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM csr_activities ORDER BY id');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/activities', async (req, res) => {
  const { title, description, category } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO csr_activities (title, description, category) VALUES ($1,$2,$3) RETURNING *',
      [title, description || null, category || 'General']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/activities/:id/join', async (req, res) => {
  const { employee_id } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO csr_participation (employee_id, activity_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING RETURNING *`,
      [employee_id, req.params.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/participation', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT cp.*, u.name AS employee_name, a.title AS activity_title
      FROM csr_participation cp
      JOIN employees e ON e.id = cp.employee_id
      JOIN users u ON u.id = e.user_id
      JOIN csr_activities a ON a.id = cp.activity_id
      ORDER BY cp.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;