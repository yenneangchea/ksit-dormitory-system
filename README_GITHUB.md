# 🏠 KSIT Dormitory Management System

> A comprehensive dormitory management system for **Kampong Speu Institute of Technology (KSIT)**, built with modern web technologies.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-green)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

**Academic Year:** 2025-2026  
**Status:** ✅ In Active Development

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The KSIT Dormitory Management System streamlines dormitory operations for students, teachers, managers, and administrators. Built with Next.js, Express, and Supabase, it provides a modern, secure, and scalable solution for managing student housing.

### Key Capabilities

- **🏠 Smart Room Assignment** - Automated allocation based on gender, major, and year
- **💰 Utility Bill Management** - Split bills with KHQR (Bakong) payment integration
- **📱 QR Code System** - Magic QR codes for attendance and room access
- **📊 Real-time Analytics** - Occupancy tracking and reporting
- **🔐 Role-Based Access** - 4 distinct user roles with appropriate permissions

---

## ✨ Features

### For Students
- 📝 Online dormitory application with document upload
- 🏠 View room assignment and roommate information
- 💳 Pay utility bills via KHQR (Cambodia's Bakong)
- 📱 Submit maintenance requests with photos
- 📊 Track attendance record

### For Teachers
- ✅ Record daily attendance via QR code scanning
- 👥 Monitor assigned students
- 📋 Approve leave requests
- 📊 Generate attendance reports

### For Managers
- 🏢 Manage buildings, rooms, and assignments
- 💵 Create and manage utility bills
- 📝 Review and approve applications
- 🔧 Track maintenance requests
- 📊 View occupancy reports

### For Administrators
- 👤 Full user management
- ⚙️ System configuration
- 🗄️ Database management
- 📈 System-wide analytics

---

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **Supabase** - PostgreSQL database with real-time capabilities
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment management

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Accessible component library

### Infrastructure
- **Git** - Version control
- **Supabase** - Backend-as-a-Service
- **Vercel** - Deployment (planned)

---

## 📁 Project Structure

```
ksit-dormitory-system/
├── backend/                    # Express.js REST API
│   ├── config/                # Configuration files
│   │   └── supabase.js       # Supabase client
│   ├── controllers/           # Route controllers
│   │   └── auth.controller.js
│   ├── middleware/            # Express middleware
│   │   └── errorHandler.js
│   ├── routes/                # API routes
│   │   └── auth.routes.js
│   ├── .env.example          # Environment template
│   ├── package.json
│   └── server.js             # Entry point
│
├── frontend/                  # Next.js application
│   └── src/
│       ├── app/              # Next.js App Router
│       │   ├── page.tsx      # Landing page
│       │   ├── login/        # Login page
│       │   └── dashboard/    # Role dashboards
│       ├── components/       # React components
│       │   └── ui/           # shadcn/ui components
│       ├── lib/              # Utilities
│       │   ├── api.ts        # API client
│       │   └── utils.ts      # Helpers
│       └── types/            # TypeScript types
│           └── index.ts
│
├── system_design.md          # Complete database schema
├── .gitignore
└── README.md
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Git**
- **Supabase account** (free tier works)

### Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ksit-dormitory-system.git
cd ksit-dormitory-system
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_secret_key
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_minimum_32_chars
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

### Step 4: Database Setup

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor
3. Copy the schema from `system_design.md`
4. Execute the SQL to create all tables and functions

### Step 5: Run the Application

**Backend (Terminal 1):**
```bash
cd backend
npm start
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase secret key | ✅ |
| `PORT` | Backend server port | ✅ |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `JWT_SECRET` | Secret for JWT tokens | ✅ |

#### Frontend (.env.local)
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ⚠️ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | ⚠️ |

⚠️ = Optional, only if using Supabase directly from frontend

---

## 📖 Usage

### User Roles

The system supports 4 distinct user roles:

1. **Admin** - Full system access and configuration
2. **Manager** - Dormitory operations and management
3. **Teacher** - Attendance tracking and student monitoring
4. **Student** - Room access, bills, and applications

### Getting Started

1. **Open Application:** http://localhost:3000
2. **Click Login** and select your role
3. **Enter Credentials** (email or Telegram ID)
4. **Access Dashboard** based on your role

### Mock Authentication

Currently, the system uses mock authentication (accepts any credentials). This will be replaced with bcrypt password hashing in production.

---

## 🗄️ Database Schema

The database includes 10 main tables:

| Table | Description |
|-------|-------------|
| `users` | User credentials and profiles (4 roles) |
| `academic_profiles` | Student academic information |
| `buildings` | Dormitory buildings |
| `rooms` | Rooms with Magic QR codes |
| `room_applications` | Student applications with documents |
| `room_assignments` | Bed assignments and history |
| `utility_bills` | Monthly utility bills per room |
| `student_bills` | Individual bills with KHQR codes |
| `attendances` | Daily attendance records |
| `maintenance_requests` | Maintenance tickets |

**Full schema:** See `system_design.md`

---

## 🔌 API Documentation

### Authentication

#### POST `/api/auth/login`
Login user with email/telegram_id and password

**Request:**
```json
{
  "identifier": "student@ksit.edu.kh",
  "password": "password123",
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "student@ksit.edu.kh",
    "role": "student",
    "full_name_latin": "Student Name",
    "full_name_khmer": "និស្សិតធម្មតា"
  }
}
```

### Health Check

#### GET `/health`
Check API status

**Response:**
```json
{
  "success": true,
  "message": "KSIT Dormitory API is running",
  "timestamp": "2026-08-11T09:25:29.278Z"
}
```

---

## 📸 Screenshots

### Landing Page
Modern, responsive landing page with feature showcase

### Login System
Role-based authentication with visual role selection

### Dashboards
- Admin Dashboard (Red theme)
- Manager Dashboard (Purple theme)
- Teacher Dashboard (Green theme)
- Student Dashboard (Blue theme)

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Project setup and structure
- [x] Backend API with Express
- [x] Frontend with Next.js and Tailwind
- [x] Landing page and login system
- [x] Role-based dashboards
- [x] Supabase integration

### Phase 2: Core Features (In Progress)
- [ ] Password hashing with bcrypt
- [ ] JWT session management
- [ ] Application form with file uploads
- [ ] Room management interface
- [ ] Waterfall auto-assignment algorithm

### Phase 3: Advanced Features
- [ ] Utility bill management
- [ ] KHQR payment integration
- [ ] QR code attendance system
- [ ] Maintenance request workflow
- [ ] Real-time notifications

### Phase 4: Polish & Deploy
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production deployment
- [ ] User documentation

---

## 🤝 Contributing

This is an academic project for KSIT. Contributions are welcome!

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Follow existing patterns

---

## 📄 License

Copyright © 2025-2026 Kampong Speu Institute of Technology (KSIT).  
All rights reserved.

This project is for academic use at KSIT.

---

## 👥 Team

**Institution:** Kampong Speu Institute of Technology (KSIT)  
**Academic Year:** 2025-2026  
**Project Type:** Dormitory Management System

---

## 📞 Support

For questions or issues:
- Contact system administrator
- Open an issue in this repository
- Email: admin@ksit.edu.kh (placeholder)

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for Backend-as-a-Service
- shadcn for the beautiful component library
- Tailwind CSS for the utility-first approach
- KSIT for supporting this project

---

**Built with ❤️ for KSIT Students**
