const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const { type } = req.query; 
  try {
    const result = type
      ? await pool.query('SELECT * FROM categories WHERE type = $1 ORDER BY id', [type])
      : await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  const { name, type, status } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  if (!['csr_activity', 'challenge'].includes(type)) {
    return res.status(400).json({ error: "type must be 'csr_activity' or 'challenge'" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO categories (name, type, status) VALUES ($1, $2, COALESCE($3, 'active')) RETURNING *`,
      [name, type, status || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE categories SET name = COALESCE($1, name), status = COALESCE($2, status) WHERE id = $3 RETURNING *`,
      [name, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete: category is in use. Set status to inactive instead.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;