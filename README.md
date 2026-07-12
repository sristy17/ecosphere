# EcoSphere — ESG Management Platform

An internal platform for tracking, gamifying, and reducing organizational carbon footprint. Employees log carbon-impact activities by department, join sustainability challenges to earn XP, and compete on a company-wide leaderboard.

## Problem Statement
Organizations struggle to make ESG (Environmental, Social, Governance) tracking engaging for employees. EcoSphere turns carbon accountability into a gamified, department-level competition — combining real emissions data with challenge-based incentives.

## Tech Stack
- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt

## Features
- User signup/login with JWT-based auth
- Department-level carbon transaction tracking
- Auto-calculated carbon summary per department
- Sustainability challenges with XP rewards
- Join/complete challenge flow
- Company-wide XP leaderboard

## Project Structure

```text
ecosphere/
├── backend/
│   ├── server.js
│   └── src/
│       ├── db/
│       │   ├── db.js
│       │   ├── schema.sql
│       │   └── seed.js
│       └── routes/
│           ├── auth.js
│           ├── departments.js
│           ├── carbon.js
│           ├── employees.js
│           └── challenges.js
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
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DB_USER, JWT_SECRET, etc.
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
| GET/POST | `/api/carbon` | List/log carbon transactions |
| GET | `/api/carbon/summary/by-department` | Carbon totals per department |
| GET/POST | `/api/employees` | List/create employees |
| GET | `/api/employees/leaderboard` | XP leaderboard |
| GET/POST | `/api/challenges` | List/create challenges |
| POST | `/api/challenges/:id/join` | Join a challenge |
| POST | `/api/challenges/:id/complete` | Complete a challenge, award XP |

## Future Improvements
- Badges/achievements UI
- Per-user "my employee record" auto-linking (currently demo-hardcoded)
- Department goal targets + progress bars
- Charts for carbon trends over time
