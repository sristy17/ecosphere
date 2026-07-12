const pool = require('./index');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Seeding demo data...');

    const depts = await pool.query(`
      INSERT INTO departments (name, code) VALUES
      ('Marketing', 'MKT'),
      ('Operations', 'OPS'),
      ('Sales', 'SLS')
      RETURNING id, name
    `);
    console.log('Departments:', depts.rows.map(d => d.name).join(', '));

    const password_hash = await bcrypt.hash('demo1234', 10);
    const users = await pool.query(`
      INSERT INTO users (email, password_hash, name) VALUES
      ('alice@eco.com', $1, 'Alice Chen'),
      ('bob@eco.com', $1, 'Bob Kumar'),
      ('carol@eco.com', $1, 'Carol Singh')
      RETURNING id, name
    `, [password_hash]);
    console.log('Users:', users.rows.map(u => u.name).join(', '));

    const engDeptId = 1; 
    const [mktId, opsId, slsId] = depts.rows.map(d => d.id);
    const [aliceId, bobId, carolId] = users.rows.map(u => u.id);

    const employees = await pool.query(`
      INSERT INTO employees (user_id, department_id, role) VALUES
      ($1, $2, 'manager'),
      ($3, $4, 'analyst'),
      ($5, $6, 'lead')
      RETURNING id
    `, [aliceId, mktId, bobId, opsId, carolId, slsId]);
    console.log('Employees created:', employees.rows.length);

    await pool.query(`
      INSERT INTO carbon_transactions (department_id, carbon_kg, source) VALUES
      ($1, 22.3, 'travel'),
      ($2, 78.1, 'electricity'),
      ($3, 15.6, 'shipping'),
      ($1, 9.4, 'electricity')
    `, [mktId, opsId, slsId]);
    console.log('Carbon transactions added');

    const challenges = await pool.query(`
      INSERT INTO challenges (title, description, xp_reward, difficulty) VALUES
      ('Zero waste lunch', 'Bring a reusable container for a week', 30, 'easy'),
      ('Bike to work', 'Cycle to work 3 days this week', 40, 'medium'),
      ('Energy audit', 'Complete a full energy audit of your floor', 80, 'hard')
      RETURNING id, title
    `);
    console.log('Challenges:', challenges.rows.map(c => c.title).join(', '));

    const [empAlice, empBob, empCarol] = employees.rows.map(e => e.id);
    const [chal1, chal2] = challenges.rows.map(c => c.id);

    await pool.query(`
      INSERT INTO challenge_participants (employee_id, challenge_id, status, xp_earned) VALUES
      ($1, $2, 'completed', 30),
      ($3, $4, 'completed', 40),
      ($5, $2, 'active', 0)
    `, [empAlice, chal1, empBob, chal2, empCarol]);
    console.log('Challenge participation seeded');

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();