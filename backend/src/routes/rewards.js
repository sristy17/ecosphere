const express = require('express');
const pool = require('../db');
const { notify } = require('../utils/notify');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM rewards WHERE status='active' ORDER BY points_required");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { name, description, points_required, stock } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO rewards (name, description, points_required, stock) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, description || null, points_required, stock || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/balance/:employee_id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COALESCE((SELECT SUM(xp_earned) FROM challenge_participants WHERE employee_id=$1), 0) AS total_earned,
        COALESCE((SELECT SUM(points_spent) FROM reward_redemptions WHERE employee_id=$1), 0) AS total_spent
    `, [req.params.employee_id]);
    const { total_earned, total_spent } = r.rows[0];
    res.json({ balance: total_earned - total_spent, total_earned, total_spent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/redeem', async (req, res) => {
  const { employee_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rewardR = await client.query('SELECT * FROM rewards WHERE id=$1 FOR UPDATE', [req.params.id]);
    const reward = rewardR.rows[0];
    if (!reward) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Reward not found' }); }
    if (reward.stock <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Out of stock' }); }
    const balR = await client.query(`
      SELECT
        COALESCE((SELECT SUM(xp_earned) FROM challenge_participants WHERE employee_id=$1), 0) -
        COALESCE((SELECT SUM(points_spent) FROM reward_redemptions WHERE employee_id=$1), 0) AS balance
    `, [employee_id]);
    const balance = parseInt(balR.rows[0].balance, 10);
    if (balance < reward.points_required) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient points. Have ${balance}, need ${reward.points_required}` });
    }
    await client.query('UPDATE rewards SET stock = stock - 1 WHERE id=$1', [req.params.id]);
    const redemption = await client.query(
      'INSERT INTO reward_redemptions (employee_id, reward_id, points_spent) VALUES ($1,$2,$3) RETURNING *',
      [employee_id, req.params.id, reward.points_required]
    );
    await client.query('COMMIT');

    await notify(employee_id, 'reward_redeemed', `You redeemed "${reward.name}" for ${reward.points_required} points.`);

    res.status(201).json(redemption.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/redemptions', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rr.*, u.name AS employee_name, rw.name AS reward_name
      FROM reward_redemptions rr
      JOIN employees e ON e.id = rr.employee_id
      JOIN users u ON u.id = e.user_id
      JOIN rewards rw ON rw.id = rr.reward_id
      ORDER BY rr.redeemed_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;