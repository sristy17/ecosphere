# EcoSphere — ESG Management Platform

An internal platform for tracking, gamifying, and reducing organizational carbon footprint, built around EcoSphere's four core modules: Environmental, Social, Governance, and Gamification. Employees log carbon-impact activities by department, join sustainability challenges to earn XP, and compete on a company-wide leaderboard, while admins manage compliance, policies, and reporting.

## Problem Statement

Organizations struggle to make ESG (Environmental, Social, Governance) tracking engaging for employees, and ESG reporting is often manual, disconnected, and hard to monitor in real time. EcoSphere integrates ESG directly into day-to-day operations — measuring sustainability metrics, encouraging employee participation, and generating meaningful reports for management — while turning carbon accountability into a gamified, department-level competition.

## Tech Stack

- **Frontend:** React (Vite), React Router, Axios, Chart.js (react-chartjs-2)
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Report exports:** pdfkit (PDF), exceljs (Excel)

## Features

### Environmental
- Department-level carbon transaction tracking
- Auto-calculated carbon summary per department, with trend chart over time
- Sustainability goals with target tracking (`environmental_scores`)
- **Emission Factors** — master-data catalog of kg CO2/unit values, categorized as Purchase / Manufacturing / Expense / Fleet
- **Operational Records** — unified log of Purchase/Manufacturing/Expense/Fleet activity that carbon gets calculated from
- **Auto Emission Calculation** (Settings toggle) — when ON, logging an operational record against a chosen emission factor immediately computes and inserts a Carbon Transaction; when OFF, records save uncalculated and can be triggered on demand via a "Calculate" action

### Social
- CSR Activities catalog with join flow and optional proof URL
- Employee Participation approval queue (approve/reject), with evidence-requirement enforcement (Settings toggle blocks approval without proof)
- *Diversity Metrics and Training Completion are not yet built — tracked as a known gap below.*

### Governance
- ESG Policies with employee acknowledgement tracking
- Audits (create, list by department/auditor/date, findings)
- Compliance Issues with severity, owner, due date, resolution status, and overdue flagging

### Gamification
- Challenges with XP rewards and difficulty; employee join/complete flow
- Badges (auto-award toggle in Settings — awarded automatically on XP/challenge thresholds when ON)
- Rewards catalog with points-based redemption, stock tracking, and redemption history
- Company-wide XP leaderboard
- *Admin-side challenge lifecycle (Draft → Active → Under Review → Completed/Archived) is not yet built — employees can currently only join/complete.*

### Settings & Administration
- Departments management (create, activate/deactivate, delete with FK-protection against departments that still have employees)
- Category management (CSR Activity / Challenge categories)
- ESG Configuration — live toggles for Auto Emission Calculation, Evidence Requirement, and Badge Auto-Award, all enforced server-side, not just stored
- Notification Settings — per-type enable/disable, read dynamically from the DB

### Reports
- Four standard reports: **Environmental**, **Social**, **Governance**, **ESG Summary**
- **Custom Report Builder** — filter by Department, Employee, Challenge, Date Range, and Module (Environmental/Social/Governance/Gamification), with live on-screen preview
- Every report (standard and custom) exports as real **PDF**, **Excel**, or **CSV**

### Notifications
- In-app notification bell with unread count, backed by `notifications` table
- Fires on compliance issue creation, CSR/Challenge approval decisions, and other configured events, respecting per-type Notification Settings

## Project Structure

```text
ecosphere/
├── backend/
│   ├── server.js
│   └── src/
│       ├── db/
│       │   ├── db.js
│       │   ├── schema.sql
│       │   ├── migration_auto_emission.sql
│       │   └── seed.js
│       └── routes/
│           ├── auth.js
│           ├── departments.js
│           ├── categories.js
│           ├── carbon.js
│           ├── employees.js
│           ├── challenges.js
│           ├── social.js
│           ├── governance.js
│           ├── rewards.js
│           ├── badges.js
│           ├── notifications.js
│           ├── settings.js
│           ├── reports.js
│           ├── emissionFactors.js
│           └── operationalRecords.js
│
└── frontend/
    └── src/
        ├── api/
        │   └── axios.js
        └── pages/
            ├── Login.jsx
            ├── Signup.jsx
            └── Dashboard.jsx
```

## Setup

### 1. Database
```bash
createdb ecosphere
psql -d ecosphere -f backend/src/db/schema.sql
psql -d ecosphere -f backend/src/db/migration_auto_emission.sql
```

### 2. Backend
```bash
cd backend
npm install
npm install pdfkit exceljs --save
cp .env.example .env   
npm run dev
```

### 3. (Optional) Seed demo data
```bash
node src/db/seed.js
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173/signup` to create an account.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/departments` | List/create departments |
| PUT/DELETE | `/api/departments/:id` | Update status / delete department |
| GET/POST | `/api/categories` | List/create categories |
| PUT/DELETE | `/api/categories/:id` | Update / delete category |
| GET/POST | `/api/carbon` | List/log carbon transactions |
| GET | `/api/carbon/summary/by-department` | Carbon totals per department |
| GET | `/api/carbon/trend` | Carbon totals over time |
| GET/POST | `/api/emission-factors` | List/create emission factors |
| PUT/DELETE | `/api/emission-factors/:id` | Update status / delete factor |
| GET/POST | `/api/operational-records` | List/log Purchase/Manufacturing/Expense/Fleet activity |
| POST | `/api/operational-records/:id/calculate` | Manually trigger emission calculation for a record |
| GET/POST | `/api/employees` | List/create employees |
| GET | `/api/employees/me` | Current user's linked employee record |
| GET | `/api/employees/leaderboard` | XP leaderboard |
| GET/POST | `/api/challenges` | List/create challenges |
| POST | `/api/challenges/:id/join` | Join a challenge |
| POST | `/api/challenges/:id/complete` | Complete a challenge, award XP |
| GET | `/api/challenges/participation` | Employee's challenge participation status |
| GET/POST | `/api/social/activities` | List/create CSR activities |
| POST | `/api/social/activities/:id/join` | Join a CSR activity |
| GET | `/api/social/participation` | Participation approval queue |
| POST | `/api/social/participation/:id/approve` | Approve participation |
| POST | `/api/social/participation/:id/reject` | Reject participation |
| GET/POST | `/api/governance/policies` | List/create ESG policies |
| POST | `/api/governance/policies/:id/acknowledge` | Acknowledge a policy |
| GET | `/api/governance/acknowledgements` | Acknowledgement records |
| GET/POST | `/api/governance/audits` | List/create audits |
| GET/POST | `/api/governance/compliance-issues` | List/create compliance issues |
| PUT | `/api/governance/compliance-issues/:id/status` | Update issue status |
| GET | `/api/badges` | List all badges |
| GET | `/api/badges/employee/:id` | Employee's earned badges |
| GET/POST | `/api/rewards` | List/create rewards |
| POST | `/api/rewards/:id/redeem` | Redeem a reward |
| GET | `/api/rewards/balance/:employeeId` | Points balance |
| GET | `/api/rewards/redemptions` | Redemption history |
| GET | `/api/notifications/:employeeId` | Employee's notifications |
| POST | `/api/notifications/:id/read` | Mark notification read |
| GET/PUT | `/api/settings/esg-configuration` | Read/update ESG config toggles |
| GET/PUT | `/api/settings/notification-settings` | Read/update notification settings |
| GET | `/api/reports/environmental` | Environmental report (json/pdf/excel/csv) |
| GET | `/api/reports/social` | Social report (json/pdf/excel/csv) |
| GET | `/api/reports/governance` | Governance report (json/pdf/excel/csv) |
| GET | `/api/reports/esg-summary` | ESG Summary report (json/pdf/excel/csv) |
| GET | `/api/reports/custom` | Custom Report Builder (json/pdf/excel/csv) |

## Business Rules Enforced

- **Evidence Requirement** — when ON, CSR participation cannot be approved without a proof URL attached
- **Auto Emission Calculation** — when ON, operational records with a linked emission factor calculate carbon automatically on creation; when OFF, they save uncalculated for manual calculation later
- **Badge Auto-Award** — when ON, badges are assigned automatically the moment an employee's XP or completed-challenge count satisfies the badge's unlock rule; when OFF, challenge completion still awards XP but not badges
- **Department deletion** is blocked (409) if the department still has employees assigned — deactivation is the intended path for those
- **Compliance Issue ownership** — every issue requires an Owner and Due Date; issues past due while still Open are flagged as overdue

## Known Gaps

Tracked against the original spec, not yet built:

- **Diversity Metrics** (Social) — no demographic fields or reporting yet
- **Training Completion** (Social) — no trainings/courses tracking yet
- **Product ESG Profiles** (master data) — not built
- **Challenge lifecycle admin** — the full Draft → Active → Under Review → Completed/Archived state machine isn't built; employees currently only have join/complete
- **Department ESG rankings visualization** and further dashboard polish