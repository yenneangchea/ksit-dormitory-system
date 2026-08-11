# KSIT Dormitory Management System - Frontend

Next.js frontend application with Tailwind CSS and shadcn/ui for the KSIT Dormitory Management System.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **React 19** - Latest React features

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed during project creation. If needed:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Supabase Configuration (optional, for direct client-side access)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page (/)
│   │   ├── login/
│   │   │   └── page.tsx       # Login page (/login)
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       └── badge.tsx
│   ├── lib/
│   │   ├── api.ts             # API client utilities
│   │   └── utils.ts           # Helper functions
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── public/                     # Static assets
├── .env.local.example         # Environment variables template
├── components.json            # shadcn/ui configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Features

### Implemented
- ✅ Landing Page with KSIT Dormitory introduction
- ✅ Login Page supporting 4 roles (admin, manager, teacher, student)
- ✅ API client with authentication endpoints
- ✅ TypeScript types based on database schema
- ✅ shadcn/ui component library

### Planned
- 🔄 Dashboard pages for each role
- 🔄 Room application form
- 🔄 Room assignment management
- 🔄 Utility bill management with KHQR integration
- 🔄 Attendance tracking via Magic QR
- 🔄 Maintenance request system
- 🔄 Student profile management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Authentication Flow

1. User selects their role on the login page
2. User enters email/telegram_id and password
3. API validates credentials against the `users` table
4. On success, user is redirected to their role-specific dashboard

## Role-Based Access

- **Admin** - Full system access, user management
- **Manager** - Dormitory operations, room assignments, bills
- **Teacher** - Attendance tracking, student monitoring
- **Student** - View room, pay bills, submit maintenance requests
