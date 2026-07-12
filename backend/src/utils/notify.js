const pool = require('../db');

async function isNotificationEnabled(type) {
  const r = await pool.query('SELECT enabled FROM notification_settings WHERE type = $1', [type]);
  return r.rows[0] ? r.rows[0].enabled : true;
}

async function notify(employee_id, type, message) {
  if (!employee_id) return; 
  const enabled = await isNotificationEnabled(type);
  if (!enabled) return;
  await pool.query(
    `INSERT INTO notifications (employee_id, type, message) VALUES ($1, $2, $3)`,
    [employee_id, type, message]
  );
}

async function getEsgConfig() {
  const r = await pool.query('SELECT * FROM esg_configuration WHERE id = 1');
  return r.rows[0] || { auto_emission_calculation: false, evidence_requirement: false, badge_auto_award: true };
}

module.exports = { notify, isNotificationEnabled, getEsgConfig };