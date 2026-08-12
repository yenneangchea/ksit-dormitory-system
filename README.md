# KSIT Dormitory Management System

The **KSIT Dormitory Management System** is a role-based residence operations platform for Kampong Speu Institute of Technology. It combines a reference-matched management workspace with application review, waterfall room allocation, utility splitting with per-student KHQR payment references, Magic QR attendance, and maintenance ticket handling.

## Delivered capabilities

| Area | Implementation |
| --- | --- |
| Role access | Dedicated **Admin**, **Manager**, **Teacher**, and **Student** dashboards with a shared portal shell and role selector. |
| Residence setup | Building and room APIs, a manager inventory panel, room capacity tracking, and unique room Magic QR values. |
| Room allocation | A waterfall assignment service that prioritizes compatible gender, matching major/year cohorts, fuller suitable rooms, then building/floor/room order. |
| Billing | Meter-based electricity, water, and trash calculations; equal active-resident splits; per-student amount and KHQR payment reference generation. |
| Attendance | Magic QR room validation, active-resident verification, daily attendance upsert, and a teacher recording workflow. |
| Maintenance | Student Magic QR ticket submission, manager/admin status updates, resolution notes, and role-filtered ticket lists. |
| Supabase | A directly executable schema is available at `supabase/schema.sql`; the backend uses a server-side Supabase client. |
| Visual design | The manager dashboard at `/dashboard/manager` reproduces the supplied KSIT reference hierarchy, colors, white card surfaces, compact controls, KPI grid, mint tab rail, and inventory empty state. |

## Architecture

```text
ksit-dormitory-system/
├── frontend/                 Next.js 15.5 + React 19 portal
│   ├── src/app/              App Router routes and four role dashboards
│   ├── src/components/       Shared KSIT portal shell
│   ├── src/lib/api.ts        Typed authenticated API client
│   ├── public/ksit-logo.png  Shared header asset
│   └── .env.local.example    Browser-safe configuration template
├── backend/                  Node.js + Express REST API
│   ├── config/               Lazy server-side Supabase client
│   ├── controllers/          Auth and domain workflow services
│   ├── middleware/           Token and role authorization middleware
│   ├── routes/               Auth and protected domain API routes
│   └── .env.example          Server-side configuration template
├── supabase/schema.sql       PostgreSQL/Supabase DDL, types, and triggers
└── system_design.md          Source schema specification
```

## Requirements

Use **Node.js 18 or newer** and npm. The project was validated using Next.js **15.5.23**, React **19.1.1**, Express **5**, and the Supabase JavaScript client.

## Local setup

First apply `supabase/schema.sql` in the Supabase SQL Editor. This creates the user, profile, building, room, application, assignment, utility, bill, attendance, and maintenance tables, along with occupancy support indexes and triggers.

Create the backend configuration from the template. The service role key remains only in the backend and must never be added to a browser environment file.

```bash
cd backend
cp .env.example .env
npm install
```

Configure `backend/.env` with actual project values.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace_with_a_random_32_character_or_longer_secret
KHR_PER_USD=4100
```

Next configure and start the frontend in another terminal.

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Start the API in the first terminal.

```bash
cd backend
npm run dev
```

The default application route redirects to the reference-matched manager workspace at `http://localhost:3000/dashboard/manager`. The API health endpoint is `http://localhost:5000/health`.

## Sample data for UI testing

After applying the schema and configuring the backend environment, seed the hosted or local Supabase project with safe, idempotent sample data. The seeder creates a `DEMO` building, four rooms, six clearly identified `.demo` student accounts, active assignments, current-month utility bills, attendance records, and maintenance tickets. Re-running it updates the same sample records instead of creating duplicates.

```bash
cd backend
npm run seed:sample
```

Do not run the sample seeder in a production database containing real residence data unless the demonstration records are explicitly desired.

## Local Supabase backup and offline recovery

Portable Bash and PowerShell backup/restore scripts are available under `scripts/`. They create a timestamped SQL export of the KSIT `public` schema and data, plus an integrity checksum. Generated backups remain ignored by Git in `backups/`.

Read the complete [local Supabase backup and recovery guide](docs/LOCAL_SUPABASE_BACKUP.md) before restoring a backup. It includes Docker Desktop and `npx supabase start` setup, offline local restore commands, verification steps, and the guarded procedure for restoring a verified backup to a cloud project.

## Authentication and roles

The login endpoint verifies bcrypt password hashes in the `users.password_hash` field and returns a signed 12-hour bearer token. The frontend keeps the token in local storage under `ksit_session_token` and supplies it to the protected API. Before production deployment, configure a strong `JWT_SECRET`, HTTPS, Supabase row-level security policies, and an account provisioning process that creates bcrypt password hashes.

| Role | Primary workspace |
| --- | --- |
| Admin | User roles, system governance, capacity, applications, and maintenance oversight. |
| Manager | Buildings, rooms, applications, waterfall assignment, CSV roster export, billing, and operations reporting. |
| Teacher | Room Magic QR verification and daily attendance recording. |
| Student | Personal bills, KHQR references, maintenance tickets, attendance visibility, and annual application submission. |

## API surface

All operational endpoints require `Authorization: Bearer <token>` after sign-in. Mutating endpoints also enforce the appropriate role.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Password-based sign-in by email or Telegram ID. |
| `GET` | `/api/auth/me` | Fetch the signed-in user profile. |
| `GET` | `/api/dashboard/summary` | Capacity, occupancy, maintenance, applications, and attendance metrics. |
| `GET`, `POST` | `/api/buildings` | Read buildings or create a building. |
| `GET`, `POST` | `/api/rooms` | Read rooms or create a room with a unique Magic QR value. |
| `GET`, `POST` | `/api/applications` | Read applications or submit a student application. |
| `PATCH` | `/api/applications/:applicationId/review` | Mark an application under review, approved, or rejected. |
| `POST` | `/api/applications/:applicationId/auto-assign` | Run waterfall bed allocation for an approved application. |
| `GET`, `POST` | `/api/utility-bills` | Read room bills or create a dynamic split bill. |
| `GET` | `/api/student-bills` | Read role-filtered individual bills and KHQR references. |
| `PATCH` | `/api/student-bills/:studentBillId/payment` | Mark a bill paid with a transaction reference. |
| `POST` | `/api/magic-qr/resolve` | Resolve a room Magic QR and its active residents. |
| `POST` | `/api/attendance/scan` | Record attendance from a verified room QR. |
| `GET` | `/api/attendance` | Read role-filtered attendance records. |
| `GET`, `POST` | `/api/maintenance` | Read tickets or submit a Magic QR-linked maintenance request. |
| `PATCH` | `/api/maintenance/:maintenanceId` | Move a ticket through its maintenance status and capture resolution notes. |
| `GET` | `/api/users` | Admin-only user directory. |
| `PATCH` | `/api/users/:userId/role` | Admin-only role update. |

## KHQR integration boundary

The bill service calculates the required amounts and creates a deterministic `KHQR` payment reference for each student. A production deployment should replace that reference generator with a secured backend-only integration to the institution’s approved Bakong/KHQR provider. Never place provider credentials in `NEXT_PUBLIC_*` variables.

## Validation

Run these commands before pushing changes.

```bash
cd backend
node --check server.js
node --check controllers/domain.controller.js

cd ../frontend
npm run build
```

The production frontend build completes successfully in the supplied implementation. The backend health endpoint is intentionally available without database variables; all database-backed endpoints fail clearly with a `503` configuration message until Supabase variables are supplied.

## GitHub handoff

The repository is ready for review and push after providing local Supabase credentials. Inspect the pending diff, then commit and push from the repository root.

```bash
git status
git add backend frontend supabase README.md system_design.md
git commit -m "feat: complete KSIT dormitory operations platform"
git push origin main
```

Do not commit `.env`, `frontend/.env.local`, Supabase service-role keys, or JWT secrets.
