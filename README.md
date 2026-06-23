# Wonder Rebar EMS — Employee Attendance Management SaaS

Complete production-ready full-stack attendance management platform: Node.js/Express + MySQL backend, React (Vite + MUI) admin panel, and React Native (Expo) employee mobile app.

## Project Structure

```
attendance-system/
├── backend/          Node.js + Express + MySQL REST API
├── admin-panel/       React + Vite + Material UI admin dashboard
├── mobile-app/        React Native (Expo) employee app
├── database/          MySQL schema
└── docs/
```

## 1. Database Setup

```bash
mysql -u root -p < database/schema.sql
```

This creates the `attendance_db` database, all 13 tables, seed departments, leave types, and a default super admin:
- Email: `superadmin@company.com`
- Password: `Admin@123`

## 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials, JWT secrets, SMTP creds
npm run dev      # nodemon, http://localhost:5000
```

Health check: `GET http://localhost:5000/health`

## 3. Admin Panel Setup

```bash
cd admin-panel
npm install
npm run dev      # http://localhost:3000 (proxies /api to localhost:5000)
```

Login with the super admin credentials above.

## 4. Mobile App Setup

```bash
cd mobile-app
npm install
```

**Before running:** open `src/api/axios.js` and replace `API_BASE_URL` with your machine's actual LAN IP (not `localhost` — a physical device can't reach your dev machine's localhost). Find your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux), then:

```js
const API_BASE_URL = 'http://192.168.X.X:5000/api';
```

Your phone and dev machine must be on the same Wi-Fi network. If Expo Go can't reach Metro over mobile data, switch your phone to the same Wi-Fi as your laptop — Expo's tunnel/LAN connection won't work across different networks without a tunnel mode (`expo start --tunnel`).

```bash
npx expo start
# scan QR with Expo Go app
```

Employees self-register via the "Register" screen, which submits a request — an admin reviews it under "Registration Requests" and finishes onboarding (department, designation, salary, role) via Add Employee in the admin panel, which emails the employee their login credentials.

## Key Architecture Notes

- **Auth**: JWT access tokens (15min) + httpOnly-cookie refresh tokens (7d) on web; SecureStore-held tokens on mobile. Both axios clients auto-refresh on 401.
- **Geofencing**: Haversine distance check in `backend/utils/geofence.js`; check-in is rejected server-side if outside the configured radius.
- **Roles**: `super_admin` > `admin` > `manager` > `employee`, enforced via `authorize(...)` middleware per-route.
- **Reports**: Daily/Monthly/Department views in admin panel, with Excel (ExcelJS) and PDF (PDFKit) export endpoints.

## Default Office Hours / Late Threshold

Configured via `.env`: `OFFICE_START_HOUR`, `OFFICE_START_MINUTE`, `LATE_THRESHOLD_MINUTES`. Adjust to your actual office timing before going live.
