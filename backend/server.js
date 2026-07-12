const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./src/db');
const authRoutes = require('./src/routes/auth');
const departmentRoutes = require('./src/routes/departments');
const carbonRoutes = require('./src/routes/carbon');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

app.use('/api/departments', departmentRoutes);
app.use('/api/carbon', carbonRoutes);