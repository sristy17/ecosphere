const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const router = express.Router();
const db = require('../db'); 

async function sendReport(res, { title, subtitle, columns, rows, format }) {
  if (format === 'csv') {
    const header = columns.map((c) => c.label).join(',');
    const body = rows
      .map((r) =>
        columns
          .map((c) => {
            const val = r[c.key] ?? '';
            const str = String(val).replace(/"/g, '""');
            return /[",\n]/.test(str) ? `"${str}"` : str;
          })
          .join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${slug(title)}.csv"`);
    return res.send(`${header}\n${body}`);
  }

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title.slice(0, 31));
    sheet.addRow(columns.map((c) => c.label)).font = { bold: true };
    rows.forEach((r) => sheet.addRow(columns.map((c) => r[c.key] ?? '')));
    sheet.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, String(cell.value ?? '').length + 2);
      });
      col.width = Math.min(max, 40);
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${slug(title)}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug(title)}.pdf"`);
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(18).text(title, { align: 'left' });
    if (subtitle) doc.fontSize(10).fillColor('#666').text(subtitle);
    doc.moveDown(1);

    const colWidth = (doc.page.width - 80) / columns.length;
    const startX = doc.x;
    let y = doc.y;

    const drawRow = (values, opts = {}) => {
      doc.fontSize(9).fillColor(opts.header ? '#000' : '#222');
      values.forEach((v, idx) => {
        doc.text(String(v ?? ''), startX + idx * colWidth, y, {
          width: colWidth - 6,
          ellipsis: true,
        });
      });
      y += 18;
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
    };

    drawRow(columns.map((c) => c.label), { header: true });
    doc.moveTo(startX, y - 4).lineTo(doc.page.width - 40, y - 4).strokeColor('#ccc').stroke();
    rows.forEach((r) => drawRow(columns.map((c) => r[c.key] ?? '')));

    doc.end();
    return;
  }

  return res.json({ title, subtitle, columns, rows });
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

router.get('/environmental', async (req, res) => {
  try {
    const { department_id, start_date, end_date, format = 'json' } = req.query;

    const ctConds = [];
    const ctParams = [];
    let i = 1;
    if (start_date) { ctConds.push(`ct.date >= $${i++}`); ctParams.push(start_date); }
    if (end_date) { ctConds.push(`ct.date <= $${i++}`); ctParams.push(end_date); }
    const ctJoin = ctConds.length ? `AND ${ctConds.join(' AND ')}` : '';

    const deptConds = [];
    const deptParams = [...ctParams];
    if (department_id) { deptConds.push(`d.id = $${i++}`); deptParams.push(department_id); }
    const deptWhere = deptConds.length ? `WHERE ${deptConds.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT d.name AS department, d.code,
              COALESCE(SUM(ct.carbon_kg), es.total_carbon_kg, 0) AS total_carbon_kg,
              es.target_kg,
              CASE WHEN es.target_kg > 0
                   THEN ROUND((COALESCE(SUM(ct.carbon_kg), es.total_carbon_kg, 0) / es.target_kg) * 100, 1)
                   ELSE NULL END AS pct_of_target
       FROM departments d
       LEFT JOIN carbon_transactions ct ON ct.department_id = d.id ${ctJoin}
       LEFT JOIN environmental_scores es ON es.department_id = d.id
       ${deptWhere}
       GROUP BY d.id, d.name, d.code, es.total_carbon_kg, es.target_kg
       ORDER BY total_carbon_kg DESC NULLS LAST`,
      deptParams
    );

    await sendReport(res, {
      title: 'Environmental Report',
      subtitle: `Emissions by department${department_id ? ' (filtered)' : ''}`,
      columns: [
        { key: 'department', label: 'Department' },
        { key: 'code', label: 'Code' },
        { key: 'total_carbon_kg', label: 'Total CO2 (kg)' },
        { key: 'target_kg', label: 'Target (kg)' },
        { key: 'pct_of_target', label: '% of Target' },
      ],
      rows,
      format,
    });
  } catch (err) {
    console.error('Environmental report error:', err);
    res.status(500).json({ error: 'Failed to generate environmental report' });
  }
});

router.get('/social', async (req, res) => {
  try {
    const { department_id, start_date, end_date, format = 'json' } = req.query;
    const conds = [];
    const params = [];
    let i = 1;
    if (department_id) { conds.push(`e.department_id = $${i++}`); params.push(department_id); }
    if (start_date) { conds.push(`cp.created_at >= $${i++}`); params.push(start_date); }
    if (end_date) { conds.push(`cp.created_at <= $${i++}`); params.push(end_date); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT d.name AS department,
              COUNT(*) AS total_participations,
              COUNT(*) FILTER (WHERE cp.approval_status = 'approved') AS approved,
              COUNT(*) FILTER (WHERE cp.approval_status = 'pending') AS pending,
              COUNT(*) FILTER (WHERE cp.approval_status = 'rejected') AS rejected,
              COALESCE(SUM(cp.points_earned), 0) AS total_points
       FROM csr_participation cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN departments d ON d.id = e.department_id
       ${where}
       GROUP BY d.id, d.name
       ORDER BY total_participations DESC`,
      params
    );

    await sendReport(res, {
      title: 'Social Report',
      subtitle:
        'CSR activity participation by department. Diversity Metrics and Training Completion are not yet tracked in this build.',
      columns: [
        { key: 'department', label: 'Department' },
        { key: 'total_participations', label: 'Total Participations' },
        { key: 'approved', label: 'Approved' },
        { key: 'pending', label: 'Pending' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'total_points', label: 'Points Earned' },
      ],
      rows,
      format,
    });
  } catch (err) {
    console.error('Social report error:', err);
    res.status(500).json({ error: 'Failed to generate social report' });
  }
});

router.get('/governance', async (req, res) => {
  try {
    const { department_id, start_date, end_date, format = 'json' } = req.query;
    const conds = [];
    const params = [];
    let i = 1;
    if (department_id) { conds.push(`ci.department_id = $${i++}`); params.push(department_id); }
    if (start_date) { conds.push(`ci.due_date >= $${i++}`); params.push(start_date); }
    if (end_date) { conds.push(`ci.due_date <= $${i++}`); params.push(end_date); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT ci.description AS issue, ci.severity, d.name AS department,
              ci.owner, ci.due_date, ci.status,
              (ci.status = 'open' AND ci.due_date < CURRENT_DATE) AS is_overdue
       FROM compliance_issues ci
       LEFT JOIN departments d ON d.id = ci.department_id
       ${where}
       ORDER BY ci.due_date ASC`,
      params
    );

    await sendReport(res, {
      title: 'Governance Report',
      subtitle: 'Compliance issues, severity, and resolution status',
      columns: [
        { key: 'issue', label: 'Issue' },
        { key: 'severity', label: 'Severity' },
        { key: 'department', label: 'Department' },
        { key: 'owner', label: 'Owner' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'status', label: 'Status' },
        { key: 'is_overdue', label: 'Overdue' },
      ],
      rows,
      format,
    });
  } catch (err) {
    console.error('Governance report error:', err);
    res.status(500).json({ error: 'Failed to generate governance report' });
  }
});

router.get('/esg-summary', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const { rows } = await db.query(
      `SELECT d.name AS department,
              es.total_carbon_kg,
              es.target_kg,
              es.score AS environmental_score
       FROM departments d
       LEFT JOIN environmental_scores es ON es.department_id = d.id
       ORDER BY d.name`
    );

    await sendReport(res, {
      title: 'ESG Summary Report',
      subtitle: 'Executive overview — department comparison',
      columns: [
        { key: 'department', label: 'Department' },
        { key: 'total_carbon_kg', label: 'Total CO2 (kg)' },
        { key: 'target_kg', label: 'Target (kg)' },
        { key: 'environmental_score', label: 'Environmental Score' },
      ],
      rows,
      format,
    });
  } catch (err) {
    console.error('ESG summary report error:', err);
    res.status(500).json({ error: 'Failed to generate ESG summary report' });
  }
});

router.get('/custom', async (req, res) => {
  try {
    const {
      module = 'environmental',
      department_id,
      employee_id,
      start_date,
      end_date,
      challenge_id,
      format = 'json',
    } = req.query;

    if (module === 'gamification') {
      const conds = [];
      const params = [];
      let i = 1;
      if (employee_id) { conds.push(`cp.employee_id = $${i++}`); params.push(employee_id); }
      if (challenge_id) { conds.push(`cp.challenge_id = $${i++}`); params.push(challenge_id); }
      if (start_date) { conds.push(`cp.joined_at >= $${i++}`); params.push(start_date); }
      if (end_date) { conds.push(`cp.joined_at <= $${i++}`); params.push(end_date); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

      const { rows } = await db.query(
        `SELECT u.name AS employee, c.title AS challenge, cp.status,
                cp.xp_earned, cp.joined_at
         FROM challenge_participants cp
         JOIN employees emp ON emp.id = cp.employee_id
         JOIN users u ON u.id = emp.user_id
         JOIN challenges c ON c.id = cp.challenge_id
         ${where}
         ORDER BY cp.joined_at DESC`,
        params
      );
      return sendReport(res, {
        title: 'Custom Report — Gamification',
        subtitle: 'Challenge participation',
        columns: [
          { key: 'employee', label: 'Employee' },
          { key: 'challenge', label: 'Challenge' },
          { key: 'status', label: 'Status' },
          { key: 'xp_earned', label: 'XP Earned' },
          { key: 'joined_at', label: 'Joined' },
        ],
        rows,
        format,
      });
    }

    if (module === 'social') {
      const conds = [];
      const params = [];
      let i = 1;
      if (department_id) { conds.push(`emp.department_id = $${i++}`); params.push(department_id); }
      if (employee_id) { conds.push(`cp.employee_id = $${i++}`); params.push(employee_id); }
      if (start_date) { conds.push(`cp.created_at >= $${i++}`); params.push(start_date); }
      if (end_date) { conds.push(`cp.created_at <= $${i++}`); params.push(end_date); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

      const { rows } = await db.query(
        `SELECT u.name AS employee, d.name AS department, a.title AS activity,
                cp.approval_status, cp.points_earned, cp.created_at
         FROM csr_participation cp
         JOIN employees emp ON emp.id = cp.employee_id
         JOIN users u ON u.id = emp.user_id
         JOIN departments d ON d.id = emp.department_id
         JOIN csr_activities a ON a.id = cp.activity_id
         ${where}
         ORDER BY cp.created_at DESC`,
        params
      );
      return sendReport(res, {
        title: 'Custom Report — Social',
        subtitle: 'CSR participation detail',
        columns: [
          { key: 'employee', label: 'Employee' },
          { key: 'department', label: 'Department' },
          { key: 'activity', label: 'Activity' },
          { key: 'approval_status', label: 'Status' },
          { key: 'points_earned', label: 'Points' },
          { key: 'created_at', label: 'Submitted' },
        ],
        rows,
        format,
      });
    }

    if (module === 'governance') {
      const conds = [];
      const params = [];
      let i = 1;
      if (department_id) { conds.push(`ci.department_id = $${i++}`); params.push(department_id); }
      if (start_date) { conds.push(`ci.due_date >= $${i++}`); params.push(start_date); }
      if (end_date) { conds.push(`ci.due_date <= $${i++}`); params.push(end_date); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

      const { rows } = await db.query(
        `SELECT ci.description AS issue, ci.severity, d.name AS department,
                ci.owner, ci.due_date, ci.status
         FROM compliance_issues ci
         LEFT JOIN departments d ON d.id = ci.department_id
         ${where}
         ORDER BY ci.due_date ASC`,
        params
      );
      return sendReport(res, {
        title: 'Custom Report — Governance',
        subtitle: 'Compliance issue detail',
        columns: [
          { key: 'issue', label: 'Issue' },
          { key: 'severity', label: 'Severity' },
          { key: 'department', label: 'Department' },
          { key: 'owner', label: 'Owner' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        format,
      });
    }

    const conds = [];
    const params = [];
    let i = 1;
    if (department_id) { conds.push(`ct.department_id = $${i++}`); params.push(department_id); }
    if (start_date) { conds.push(`ct.date >= $${i++}`); params.push(start_date); }
    if (end_date) { conds.push(`ct.date <= $${i++}`); params.push(end_date); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT d.name AS department, ct.carbon_kg, ct.source, ct.date
       FROM carbon_transactions ct
       JOIN departments d ON d.id = ct.department_id
       ${where}
       ORDER BY ct.date DESC`,
      params
    );
    return sendReport(res, {
      title: 'Custom Report — Environmental',
      subtitle: 'Carbon transaction detail',
      columns: [
        { key: 'department', label: 'Department' },
        { key: 'carbon_kg', label: 'CO2 (kg)' },
        { key: 'source', label: 'Source' },
        { key: 'date', label: 'Date' },
      ],
      rows,
      format,
    });
  } catch (err) {
    console.error('Custom report error:', err);
    res.status(500).json({ error: 'Failed to generate custom report' });
  }
});

module.exports = router;