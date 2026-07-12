const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./src/db');
const authRoutes = require('./src/routes/auth');
const departmentRoutes = require('./src/routes/departments');
const carbonRoutes = require('./src/routes/carbon');
const employeeRoutes = require('./src/routes/employees');
const challengeRoutes = require('./src/routes/challenges');
const badgeRoutes = require('./src/routes/badges');
const socialRoutes = require('./src/routes/social');
const governanceRoutes = require('./src/routes/governance');
const rewardsRoutes = require('./src/routes/rewards');
const notificationsRoutes = require('./src/routes/notifications');
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
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use('/api/departments', departmentRoutes);
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/carbon', carbonRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/notifications', notificationsRoutes);