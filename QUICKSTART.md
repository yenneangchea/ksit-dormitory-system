# Quick Start Guide - KSIT Dormitory System

Get the KSIT Dormitory Management System up and running in minutes.

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### Step 2: Configure Environment Variables

**Backend** - Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-minimum-32-characters
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 3: Setup Database

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor
3. Copy and paste the entire schema from `system_design.md`
4. Execute the SQL

### Step 4: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

## 🧪 Testing the Login

Since we have a mock authentication system, you can test with any credentials:

1. Go to http://localhost:3000
2. Click "Login"
3. Select a role (Admin, Manager, Teacher, or Student)
4. Enter any email and password
5. Click "Sign In"

**Note:** Currently accepts any credentials. In production, this will validate against the `users` table with password hashing.

## 📊 Creating Test Users

Run this SQL in your Supabase SQL Editor:

```sql
-- Admin User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('admin', 'អ្នកគ្រប់គ្រង', 'Admin User', 'male', '012345678', 'admin@ksit.edu.kh', 'hashed_password');

-- Manager User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('manager', 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', 'Dorm Manager', 'female', '012345679', 'manager@ksit.edu.kh', 'hashed_password');

-- Teacher User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('teacher', 'គ្រូបង្រៀន', 'Teacher Name', 'male', '012345680', 'teacher@ksit.edu.kh', 'hashed_password');

-- Student User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('student', 'និស្សិតធម្មតា', 'Student Name', 'male', '012345681', 'student@ksit.edu.kh', 'hashed_password');
```

## 🎯 What You Can Do Now

### Landing Page (/)
- View system features
- See statistics
- Navigate to login

### Login (/login)
- Select role (Admin/Manager/Teacher/Student)
- Mock login with any credentials
- Redirect to role-specific dashboard

### Dashboards
- **Admin:** `/dashboard/admin` - System-wide management
- **Manager:** `/dashboard/manager` - Dormitory operations
- **Teacher:** `/dashboard/teacher` - Attendance and monitoring
- **Student:** `/dashboard/student` - Personal room and bills

## 🐛 Troubleshooting

### Backend won't start
- Check if port 5000 is available
- Verify `.env` file exists with valid Supabase credentials
- Run `npm install` again

### Frontend won't start
- Check if port 3000 is available
- Verify `.env.local` file exists
- Run `npm install` again

### Login doesn't work
- Check browser console for errors
- Verify backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### Database connection fails
- Verify Supabase URL and anon key
- Check if database schema is created
- Test connection in Supabase dashboard

## 📁 Project Files Overview

```
ksit-dormitory-system/
├── backend/
│   ├── config/supabase.js       ← Database connection
│   ├── controllers/auth.controller.js  ← Login logic
│   ├── routes/auth.routes.js    ← API routes
│   ├── server.js                ← Main backend entry
│   └── .env                     ← Backend config (create this)
├── frontend/
│   ├── src/app/page.tsx         ← Landing page
│   ├── src/app/login/page.tsx   ← Login page
│   ├── src/lib/api.ts           ← API client
│   └── .env.local               ← Frontend config (create this)
└── system_design.md             ← Database schema
```

## 🚀 Next Development Steps

1. **Add Real Authentication**
   - Implement bcrypt password hashing
   - Add JWT token generation
   - Secure API endpoints

2. **Build Application Form**
   - Create student application form
   - Add file upload for documents
   - Implement application review workflow

3. **Room Management**
   - Build room creation interface
   - Implement auto-assignment algorithm
   - Add room occupancy tracking

4. **Bill Management**
   - Create utility bill input forms
   - Implement bill splitting logic
   - Integrate KHQR payment system

## 💡 Tips

- Keep both terminals (backend + frontend) running
- Check browser console for frontend errors
- Check terminal output for backend errors
- Use Supabase dashboard to inspect database
- Test API endpoints with Postman or curl

## 🔗 Useful Links

- **Supabase Dashboard:** https://app.supabase.com
- **Next.js Docs:** https://nextjs.org/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com

---

**Need Help?** Check the main `README.md` or contact the system administrator.
