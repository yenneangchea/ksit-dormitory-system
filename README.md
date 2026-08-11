# KSIT Dormitory Management System

A comprehensive dormitory management system for Kampong Speu Institute of Technology (KSIT), built with modern web technologies.

## 🚀 Quick Start

**System is Ready!** Both servers are running:

- **Frontend:** http://localhost:3000 ✅
- **Backend:** http://localhost:5000 ✅
- **Status:** See `YOUR_SYSTEM_IS_READY.md` for details

**Next Step:** Set up database schema → See `SUPABASE_SETUP.md`

## 🏗️ Project Structure

```
ksit-dormitory-system/
├── backend/                 # Express.js REST API
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   └── server.js           # Main server entry point
├── frontend/               # Next.js web application
│   └── src/
│       ├── app/            # Next.js App Router pages
│       ├── components/     # React components (shadcn/ui)
│       ├── lib/            # Utilities and API client
│       └── types/          # TypeScript type definitions
└── system_design.md        # Database schema and system design
```

## 🚀 Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API framework
- **Supabase** (PostgreSQL) - Database with real-time capabilities
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **React 19** - Latest React features

## 📋 Features Implemented

### ✅ Phase 1: Authentication & Landing (Current)

#### Backend
- [x] Express server with error handling
- [x] Supabase client configuration
- [x] Authentication API (`/api/auth/login`)
- [x] Mock login endpoint (validates against users table)
- [x] CORS configuration for frontend

#### Frontend
- [x] Modern, responsive landing page
- [x] Role-based login system (Admin, Manager, Teacher, Student)
- [x] Role selection with visual cards
- [x] Login form with email/telegram_id support
- [x] Dashboard pages for all 4 roles
- [x] Protected routes with role verification
- [x] API client with authentication methods
- [x] TypeScript types matching database schema

### 🔄 Phase 2: Core Features (Planned)

- [ ] Student dormitory applications with document upload
- [ ] Waterfall auto-assignment algorithm
- [ ] Room management interface
- [ ] Utility bill creation and split calculation
- [ ] KHQR (Bakong QR) payment integration
- [ ] Attendance tracking with Magic QR codes
- [ ] Maintenance request system
- [ ] Student profile management

## 🗄️ Database Schema

The complete PostgreSQL schema is defined in `system_design.md` and includes:

| Table | Description |
|-------|-------------|
| `users` | User credentials and profiles (4 roles) |
| `academic_profiles` | Detailed student academic information |
| `buildings` | Dormitory building information |
| `rooms` | Room details with Magic QR codes |
| `room_applications` | Student applications with document verification |
| `room_assignments` | Bed assignments and history |
| `utility_bills` | Monthly utility bills per room |
| `student_bills` | Individual student bills with KHQR |
| `attendances` | Daily room attendance records |
| `maintenance_requests` | Maintenance tickets and tracking |

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account (or PostgreSQL database)
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ksit-dormitory-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
```

Run the backend:
```bash
npm run dev
```

Backend will be available at `http://localhost:5000`

### 3. Database Setup

Execute the SQL schema from `system_design.md` in your Supabase SQL editor or PostgreSQL client to create all tables, types, and triggers.

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Run the frontend:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## 🔐 User Roles & Permissions

### Admin
- Full system access
- User management
- Building and room configuration
- System settings
- Database management

### Manager
- Dormitory operations
- Room assignments
- Utility bill management
- Application review and approval
- Maintenance tracking

### Teacher
- Attendance tracking
- Student monitoring
- Room inspections
- Leave request approval
- Attendance reports

### Student
- View room assignment
- Pay utility bills via KHQR
- Submit maintenance requests
- View attendance record
- Apply for dormitory

## 📱 Key Features

### 🏠 Smart Room Assignment
Waterfall algorithm automatically assigns students based on:
- Gender compatibility
- Major and academic year grouping
- Room capacity optimization

### 💳 KHQR Bill Payment
Integration with Cambodia's Bakong payment system:
- Dynamic QR code generation
- Automatic bill splitting among roommates
- Real-time payment verification

### 📱 Magic QR Codes
Each room has a unique QR code for:
- Daily attendance check-in
- Quick access to room information
- Maintenance request submission

### 📊 Comprehensive Tracking
- Real-time occupancy monitoring
- Attendance analytics
- Bill payment status
- Maintenance request resolution

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout (TODO)
- `GET /api/auth/me` - Get current user (TODO)

### Health Check
- `GET /health` - API health status

## 🎨 UI Components

Using **shadcn/ui** component library:
- Button, Card, Input, Label
- Select, Badge
- Responsive and accessible
- Customizable with Tailwind CSS

## 📝 Development Notes

### Current Implementation Status

1. **Authentication** - Mock authentication (no password hashing yet)
2. **Session Management** - Using localStorage (JWT implementation planned)
3. **Database** - Schema defined, need to populate with initial data
4. **Payment Integration** - KHQR implementation pending

### Next Steps

1. Implement bcrypt password hashing
2. Add JWT session management
3. Build application form with file uploads
4. Implement auto-assignment algorithm
5. Integrate KHQR API for payments
6. Add QR code scanning functionality

## 🤝 Contributing

This is an academic project for KSIT. For questions or contributions, please contact the system administrator.

## 📄 License

Copyright © 2025-2026 Kampong Speu Institute of Technology. All rights reserved.

---

**Academic Year:** 2025-2026  
**Institution:** Kampong Speu Institute of Technology (KSIT)  
**System:** Dormitory Management Platform
