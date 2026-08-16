# Phase 2: Core Features Setup Guide

## 🎯 Overview

This guide will help you set up the database and prepare for Phase 2 core features development.

## ✅ Prerequisites

- Supabase account with active project
- Backend and frontend already configured
- Supabase URL and API key in `.env` files

## 📋 Step-by-Step Instructions

### Step 1: Access Supabase SQL Editor

1. Open your browser and go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ukdpgzbzrzosbxvsxifc`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query** button

### Step 2: Create Database Schema

1. Open the file `database_schema.sql` in your code editor
2. Copy the **entire contents** of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** button (or press Ctrl+Enter)
5. Wait for execution to complete

**Expected Result:**
```
✅ KSIT Dormitory System Database Schema Created Successfully!
Tables created: 11
Enum types created: 10
Triggers created: 3
Next step: Run the test data insert script
```

### Step 3: Insert Test Data

1. Open the file `test_data.sql` in your code editor
2. Copy the **entire contents** of the file
3. In Supabase SQL Editor, click **New Query**
4. Paste the test data SQL
5. Click **Run** button
6. Wait for execution to complete

**Expected Result:**
```
✅ Test data inserted successfully!
Users created: 24 (1 admin, 1 manager, 2 teachers, 20 students)
Academic profiles: 20 students
Buildings: 3
Rooms: 20

📝 Test Login Credentials (password: test123):
  Admin: admin@ksit.edu.kh
  Manager: manager@ksit.edu.kh
  Teacher: sokha@ksit.edu.kh
  Student: sophal@student.ksit.edu.kh
```


### Step 4: Verify Database Setup

1. In Supabase, click **Table Editor** in the left sidebar
2. You should see all 11 tables:
   - ✅ users
   - ✅ academic_profiles
   - ✅ buildings
   - ✅ rooms
   - ✅ room_applications
   - ✅ room_assignments
   - ✅ utility_bills
   - ✅ student_bills
   - ✅ attendances
   - ✅ maintenance_requests

3. Click on **users** table - you should see 24 users
4. Click on **rooms** table - you should see 20 rooms

### Step 5: Hash Passwords

1. Open a terminal in the backend folder:
   ```bash
   cd backend
   npm run hash-passwords
   ```

2. Wait for the script to complete (should take a few seconds)

3. You should see:
   ```
   ✅ Password hashing complete!
   📊 Updated: 24 users
   🔐 Test password for all users: test123
   ```

### Step 6: Test Authentication

1. Make sure both servers are running:
   ```bash
   # Run from project root
   start-dev.bat
   ```

2. Open browser: http://localhost:3000

3. Click **Login** button

4. Test with these credentials:
   - **Email:** `admin@ksit.edu.kh`
   - **Password:** `test123`
   - **Role:** Admin

5. You should see:
   - ✅ Successful login with JWT token
   - ✅ Redirected to admin dashboard
   - ✅ Password is now securely hashed with bcrypt

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Row Count |
|-------|---------|-----------|
| `users` | All user accounts (4 roles) | 24 |
| `academic_profiles` | Student details | 20 |
| `buildings` | Dormitory buildings | 3 |
| `rooms` | Individual rooms | 20 |
| `room_applications` | Student applications | 0 (empty) |
| `room_assignments` | Bed assignments | 0 (empty) |
| `utility_bills` | Room utility bills | 0 (empty) |
| `student_bills` | Individual bills | 0 (empty) |
| `attendances` | Daily attendance | 0 (empty) |
| `maintenance_requests` | Maintenance tickets | 0 (empty) |

### User Breakdown

- **1 Admin:** admin@ksit.edu.kh
- **1 Manager:** manager@ksit.edu.kh
- **2 Teachers:** sokha@ksit.edu.kh, sreida@ksit.edu.kh
- **20 Students:** 10 male, 10 female

### Building & Room Structure

**Male Building 1 (BLDG-M1):**
- Floor 1: 5 rooms (M1-101 to M1-105) - Year 1 & 2 students
- Floor 2: 5 rooms (M1-201 to M1-205) - Year 3 & 4 students

**Female Building 1 (BLDG-F1):**
- Floor 1: 5 rooms (F1-101 to F1-105) - Year 1 & 2 students
- Floor 2: 5 rooms (F1-201 to F1-205) - Year 3 & 4 students

Each room has:
- Capacity: 4 students
- Unique Magic QR Code
- Gender restriction
- Assigned major and year

## 🔍 Verify Data with SQL

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check all users by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- Check all rooms by building
SELECT b.name, COUNT(r.id) as room_count
FROM buildings b
LEFT JOIN rooms r ON r.building_id = b.id
GROUP BY b.name;

-- Check students with academic profiles
SELECT u.full_name_latin, ap.major, ap.academic_year
FROM users u
JOIN academic_profiles ap ON ap.user_id = u.id
WHERE u.role = 'student'
ORDER BY ap.academic_year, ap.major, u.full_name_latin;
```


## 🚨 Important Notes

### Password Security
⚠️ **Current passwords are plaintext (`test123`)** - This is temporary!
- Task #3 will implement bcrypt password hashing
- Never use plaintext passwords in production

### Database Triggers
✅ The schema includes automatic triggers:
- **Room Occupancy Trigger:** Automatically updates room status when students are assigned
- **Timestamp Triggers:** Auto-updates `updated_at` fields

### Magic QR Codes
Each room has a unique Magic QR Code:
- Format: `QR-{BUILDING}-{ROOM}-{YEAR}`
- Example: `QR-M1-101-2025`
- Used for attendance and maintenance requests

## 🔄 What's Next?

After completing database setup, the Phase 2 tasks are:

1. ✅ **Task #1:** Set up database schema (COMPLETED)
2. ✅ **Task #2:** Create test users and sample data (COMPLETED)
3. ⬜ **Task #3:** Implement password hashing with bcrypt
4. ⬜ **Task #4:** Build student application form
5. ⬜ **Task #5:** Implement room management interface
6. ⬜ **Task #6:** Build waterfall auto-assignment algorithm
7. ⬜ **Task #7:** Create utility bill management system
8. ⬜ **Task #8:** Integrate KHQR payment system
9. ⬜ **Task #9:** Build attendance tracking system
10. ⬜ **Task #10:** Implement maintenance request system

## ❓ Troubleshooting

### Error: "type already exists"
If you get errors about types already existing:
1. The schema includes DROP TYPE IF EXISTS statements
2. If still failing, manually drop tables first:
   ```sql
   DROP TABLE IF EXISTS maintenance_requests CASCADE;
   DROP TABLE IF EXISTS attendances CASCADE;
   DROP TABLE IF EXISTS student_bills CASCADE;
   DROP TABLE IF EXISTS utility_bills CASCADE;
   DROP TABLE IF EXISTS room_assignments CASCADE;
   DROP TABLE IF EXISTS room_applications CASCADE;
   DROP TABLE IF EXISTS rooms CASCADE;
   DROP TABLE IF EXISTS buildings CASCADE;
   DROP TABLE IF EXISTS academic_profiles CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```
3. Then run the schema script again

### Error: "relation does not exist"
- Make sure you run `database_schema.sql` BEFORE `test_data.sql`
- Tables must be created first

### No data appearing
- Check Supabase connection in backend `.env`
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check backend logs for connection errors

## 📞 Need Help?

If you encounter issues:
1. Check the SQL query results in Supabase
2. Verify your Supabase credentials in `.env` files
3. Check backend console logs for errors
4. Review the error messages carefully

---

**Ready to continue?** Once database is set up, proceed to Task #3: Implement password hashing with bcrypt.
