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

router.get('/audits', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.*, d.name AS department_name
      FROM audits a
      LEFT JOIN departments d ON d.id = a.department_id
      ORDER BY a.audit_date DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/audits', async (req, res) => {
  const { title, department_id, auditor, audit_date, findings, status } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const r = await pool.query(
      `INSERT INTO audits (title, department_id, auditor, audit_date, findings, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'under_review')) RETURNING *`,
      [title, department_id || null, auditor || null, audit_date || null, findings || null, status || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/audits/:id', async (req, res) => {
  const { status, findings } = req.body;
  try {
    const r = await pool.query(
      `UPDATE audits SET status = COALESCE($1, status), findings = COALESCE($2, findings) WHERE id=$3 RETURNING *`,
      [status || null, findings || null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/compliance-issues', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT ci.*, d.name AS department_name, a.title AS audit_title,
        (ci.status = 'open' AND ci.due_date < CURRENT_DATE) AS is_overdue
      FROM compliance_issues ci
      LEFT JOIN departments d ON d.id = ci.department_id
      LEFT JOIN audits a ON a.id = ci.audit_id
      ORDER BY ci.due_date ASC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/compliance-issues', async (req, res) => {
  const { audit_id, severity, description, department_id, owner, due_date } = req.body;
  if (!severity || !description || !owner || !due_date) {
    return res.status(400).json({ error: 'severity, description, owner, and due_date are required' });
  }
  try {
    const r = await pool.query(
      `INSERT INTO compliance_issues (audit_id, severity, description, department_id, owner, due_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [audit_id || null, severity, description, department_id || null, owner, due_date]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/compliance-issues/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const r = await pool.query(
      `UPDATE compliance_issues SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;