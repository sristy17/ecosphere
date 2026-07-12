const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          e.id,
          e.role,
          e.status,
          e.department_id,
          u.name,
          u.email,
          d.name AS department
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.user_id = $1
      `,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No employee record',
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch employee record',
    });
  }
});

router.patch('/me/department', authenticate, async (req, res) => {
  const { department_id } = req.body;

  if (!department_id) {
    return res.status(400).json({
      error: 'department_id is required',
    });
  }

  try {
    const department = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [department_id]
    );

    if (department.rows.length === 0) {
      return res.status(404).json({
        error: 'Department not found',
      });
    }

    const result = await pool.query(
      `
        UPDATE employees
        SET department_id = $1
        WHERE user_id = $2
        RETURNING id, user_id, department_id, role, status
      `,
      [department_id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No employee record',
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to update department',
    });
  }
});

router.post('/', async (req, res) => {
  const { user_id, department_id, role } = req.body;

  if (!user_id || !department_id) {
    return res.status(400).json({
      error: 'user_id and department_id are required',
    });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO employees (user_id, department_id, role)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [user_id, department_id, role || 'member']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to create employee',
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.role,
        e.status,
        u.name,
        u.email,
        d.name AS department
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY e.id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch employees',
    });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.name,
        e.id AS employee_id,
        COALESCE(SUM(cp.xp_earned), 0) AS total_xp
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN challenge_participants cp ON cp.employee_id = e.id
      GROUP BY u.name, e.id
      ORDER BY total_xp DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
    });
  }
});

router.put('/:id', async (req, res) => {
  const { department_id, role } = req.body;
  try {
    const result = await pool.query(
      `UPDATE employees SET department_id = COALESCE($1, department_id), role = COALESCE($2, role)
       WHERE id = $3 RETURNING *`,
      [department_id, role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

module.exports = router;