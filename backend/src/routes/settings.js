const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/esg-configuration', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM esg_configuration WHERE id = 1');
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ESG configuration' });
  }
});

router.put('/esg-configuration', async (req, res) => {
  const { auto_emission_calculation, evidence_requirement, badge_auto_award } = req.body;
  try {
    const r = await pool.query(
      `UPDATE esg_configuration SET
        auto_emission_calculation = COALESCE($1, auto_emission_calculation),
        evidence_requirement = COALESCE($2, evidence_requirement),
        badge_auto_award = COALESCE($3, badge_auto_award),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 1 RETURNING *`,
      [auto_emission_calculation, evidence_requirement, badge_auto_award]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ESG configuration' });
  }
});

router.get('/notification-settings', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notification_settings ORDER BY type');
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

router.put('/notification-settings/:type', async (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined) return res.status(400).json({ error: 'enabled is required' });
  try {
    const r = await pool.query(
      'UPDATE notification_settings SET enabled = $1 WHERE type = $2 RETURNING *',
      [enabled, req.params.type]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Unknown notification type' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification setting' });
  }
});

module.exports = router;