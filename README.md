# EcoSphere — ESG Management Platform

An internal platform for tracking, gamifying, and reducing organizational carbon footprint while managing the full Environmental, Social, and Governance lifecycle. Employees log carbon-impact activities and CSR participation by department, join sustainability challenges to earn XP and badges, redeem rewards, and compete on a company-wide leaderboard — while admins track audits, compliance issues, and policy acknowledgements, and configure business rules from a central Settings panel.

## Problem Statement
Organizations struggle to make ESG (Environmental, Social, Governance) tracking engaging for employees, and ESG reporting is often manual, disconnected, and hard to monitor in real time. EcoSphere integrates ESG directly into day-to-day operations — combining real emissions data, CSR/compliance tracking, and challenge-based gamification into one dashboard.

## Tech Stack
- **Frontend:** React (Vite), React Router, Axios, Chart.js
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt

## Features

### Environmental
- Department-level carbon transaction tracking with trend chart over time
- Department carbon targets + progress bars
- Auto-calculated carbon summary per department

### Social
- CSR Activities with join flow and proof-of-completion (evidence URL)
- Employee Participation approval queue (approve/reject)
- **Evidence Requirement** toggle: when enabled, participation cannot be approved without attached proof

### Governance
- ESG Policies with employee acknowledgement tracking
- Audits — create/list, linked to departments
- Compliance Issues — severity-tagged, owner + due-date required, auto-flagged when overdue and still open
- Overdue compliance issues automatically notify the assigned owner (deduped, no repeat spam on refresh)

### Gamification
- Sustainability Challenges with XP rewards and difficulty levels
- Join / Complete flow with persisted participation status (survives page refresh via a real participation-status endpoint, not local-only state)
- Badges, auto-awarded on XP/completion thresholds — gated by the **Badge Auto-Award** toggle
- Company-wide XP leaderboard
- Reward catalog with points-based redemption (stock-limited, balance-checked, transaction-safe)

### Settings & Administration
- **Departments** — full CRUD, parent-department hierarchy, active/inactive status, live employee-count per department
- **Categories** — shared CSR Activity / Challenge category master data, active/inactive status
- **ESG Configuration** — live toggles for Auto Emission Calculation, Evidence Requirement, and Badge Auto-Award, all of which actually gate backend behavior (not just stored flags)
- **Notification Settings** — per-event on/off switches (compliance raised/overdue, CSR approved/rejected, challenge completed, badge unlocked, reward redeemed); disabling a type suppresses that notification everywhere it's triggered

### Platform-wide
- User signup/login with JWT-based auth
- In-app notification bell with unread badge, click-to-dismiss, click-outside-to-close
- Executive dashboard with Environmental / Social / Governance / Overall ESG scores

## Project Structure

```text
ecosphere/
├── backend/
│   ├── server.js
│   └── src/
│       ├── db/
│       │   ├── db.js
│       │   ├── schema.sql
│       │   ├── audits_compliance.sql
│       │   ├── social_evidence.sql
│       │   ├── social_governance.sql
│       │   ├── rewards_notifications.sql
│       │   ├── settings.sql
│       │   └── seed.js
│       ├── utils/
│       │   └── notify.js
│       └── routes/
│           ├── auth.js
│           ├── departments.js
│           ├── categories.js
│           ├── settings.js
│           ├── carbon.js
│           ├── employees.js
│           ├── challenges.js
│           ├── badges.js
│           ├── social.js
│           ├── governance.js
│           ├── rewards.js
│           └── notifications.js
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
psql -d ecosphere -f backend/src/db/audits_compliance.sql
psql -d ecosphere -f backend/src/db/social_evidence.sql
psql -d ecosphere -f backend/src/db/social_governance.sql
psql -d ecosphere -f backend/src/db/rewards_notifications.sql
psql -d ecosphere -f backend/src/db/settings.sql
```

### 2. Backend
```bash
cd backend
npm install
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
| GET/POST/PUT/DELETE | `/api/departments` | Departments CRUD (parent hierarchy, status, derived employee count) |
| POST | `/api/departments/:id/target` | Set a department's carbon target |
| GET/POST/PUT/DELETE | `/api/categories` | Category CRUD (CSR Activity / Challenge, filterable by `?type=`) |
| GET/PUT | `/api/settings/esg-configuration` | Read/update Auto Emission Calc, Evidence Requirement, Badge Auto-Award toggles |
| GET/PUT | `/api/settings/notification-settings` `/:type` | Read/update per-notification-type on/off |
| GET/POST | `/api/carbon` | List/log carbon transactions |
| GET | `/api/carbon/summary/by-department` | Carbon totals per department |
| GET | `/api/carbon/trend` | Carbon logged over time |
| GET/POST | `/api/employees` | List/create employees |
| GET | `/api/employees/me` | Current logged-in employee record |
| GET | `/api/employees/leaderboard` | XP leaderboard |
| GET/POST | `/api/challenges` | List/create challenges |
| POST | `/api/challenges/:id/join` | Join a challenge |
| POST | `/api/challenges/:id/complete` | Complete a challenge, award XP, auto-award eligible badges (if enabled) |
| GET | `/api/challenges/participation` | Employee's real joined/completed challenge status |
| GET | `/api/badges` | All badges |
| GET | `/api/badges/employee/:id` | Badges earned by an employee |
| GET/POST | `/api/social/activities` | List/create CSR activities |
| POST | `/api/social/activities/:id/join` | Join a CSR activity, optional proof URL |
| GET | `/api/social/participation` | Approval queue |
| POST | `/api/social/participation/:id/approve` | Approve (blocked without proof if Evidence Requirement is on) |
| POST | `/api/social/participation/:id/reject` | Reject |
| GET/POST | `/api/governance/policies` | List/create ESG policies |
| POST | `/api/governance/policies/:id/acknowledge` | Acknowledge a policy |
| GET | `/api/governance/acknowledgements` | All acknowledgements |
| GET/POST/PUT | `/api/governance/audits` | List/create/update audits |
| GET/POST/PUT | `/api/governance/compliance-issues` `/:id/status` | List (auto-flags overdue), create (requires owner + due date), update status |
| GET/POST | `/api/rewards` | Reward catalog |
| GET | `/api/rewards/balance/:employee_id` | Points balance |
| POST | `/api/rewards/:id/redeem` | Redeem a reward (transaction-safe stock/balance check) |
| GET | `/api/rewards/redemptions` | Redemption history |
| GET | `/api/notifications/:employee_id` | An employee's notifications |
| POST | `/api/notifications/:id/read` | Mark a notification read |

## Business Rules Implemented
- **Compliance Issue Ownership:** every issue requires an `owner` and `due_date`; issues past due while still open are auto-flagged and notify the resolved owner (deduped).
- **Evidence Requirement:** gated by Settings toggle — when on, CSR participation cannot be approved without a proof URL.
- **Badge Auto-Award:** gated by Settings toggle — when off, challenge completion still awards XP but skips badge assignment.
- **Notification Settings:** every notification insert (CSR approval/rejection, challenge completion, badge unlock, reward redemption, compliance raised/overdue) is routed through a shared `notify()` helper that checks `notification_settings` before sending.

## Known Gaps / Not Yet Built
- **Auto Emission Calculation** — toggle exists and is stored, but the calculation logic from Purchase/Manufacturing/Expense/Fleet records is not yet implemented; carbon transactions are still entered manually.
- **Custom Report Builder & standard reports** (Environmental/Social/Governance/ESG Summary) — not built.
- **Diversity Metrics & Training Completion** (Social) — not built.
- **Emission Factors & Product ESG Profiles** (master data) — not built.
- **Full Challenge lifecycle admin UI** (Draft → Active → Under Review → Completed/Archived) — challenges currently go straight to joinable; there's no admin state-machine UI yet.
- **Owner-to-employee matching for Compliance Issues** is done via exact-name string match against `users.name`, not an employee picker — mismatched names silently fail to notify (the UI does warn on creation if this happens).

## Future Improvements
- Charts/visualizations for Social and Governance scores (currently only Environmental has a trend chart)
- Department ESG rankings (bonus feature from spec)
- Mobile-responsive layout pass
- Employee picker (instead of free-text name) for Compliance Issue ownership