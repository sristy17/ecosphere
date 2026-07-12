const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/:employee_id', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM notifications WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.params.employee_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/read', async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 RETURNING *', [req.params.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;