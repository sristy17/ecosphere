const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { title, description, xp_reward, difficulty, deadline } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const result = await pool.query(
      `INSERT INTO challenges (title, description, xp_reward, difficulty, deadline)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || null, xp_reward || 10, difficulty || 'easy', deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM challenges ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.post('/:id/join', async (req, res) => {
  const { employee_id } = req.body;
  const challenge_id = req.params.id;
  if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });

  try {
    const result = await pool.query(
      `INSERT INTO challenge_participants (employee_id, challenge_id)
       VALUES ($1, $2) RETURNING *`,
      [employee_id, challenge_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already joined this challenge' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

router.post('/:id/complete', async (req, res) => {
  const { employee_id } = req.body;
  const challenge_id = req.params.id;
  if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });

  try {
    const challenge = await pool.query('SELECT xp_reward FROM challenges WHERE id = $1', [challenge_id]);
    if (challenge.rows.length === 0) return res.status(404).json({ error: 'Challenge not found' });

    const xp = challenge.rows[0].xp_reward;

    const result = await pool.query(
      `UPDATE challenge_participants
       SET status = 'completed', xp_earned = $1
       WHERE employee_id = $2 AND challenge_id = $3 RETURNING *`,
      [xp, employee_id, challenge_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not joined to this challenge' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
});

module.exports = router;