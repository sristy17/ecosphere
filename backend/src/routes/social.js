const express = require('express');
const pool = require('../db');
const { notify, getEsgConfig } = require('../utils/notify');
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
  const { employee_id, proof_url } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO csr_participation (employee_id, activity_id, proof_url) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING RETURNING *`,
      [employee_id, req.params.id, proof_url || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/participation/:id/approve', async (req, res) => {
  try {
    const check = await pool.query('SELECT proof_url FROM csr_participation WHERE id=$1', [req.params.id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });

    const config = await getEsgConfig();
    if (config.evidence_requirement && !check.rows[0].proof_url) {
      return res.status(400).json({ error: 'Cannot approve without proof — evidence is required (Settings → ESG Configuration)' });
    }

    const r = await pool.query(
      `UPDATE csr_participation SET approval_status='approved', points_earned=25, reviewed_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    await notify(r.rows[0].employee_id, 'csr_approved', 'Your CSR activity participation was approved — 25 points earned.');
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/participation/:id/reject', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE csr_participation SET approval_status='rejected', reviewed_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    await notify(r.rows[0].employee_id, 'csr_rejected', 'Your CSR activity participation was rejected. You can review and resubmit.');
    res.json(r.rows[0]);
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