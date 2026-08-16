# 🔐 Test Login Guide

## Current Authentication: MOCK MODE

Your system currently uses **mock authentication** for development. This means:

✅ Password validation is **disabled**
✅ Any password will work
✅ Only checks if user exists in database

---

## 📝 Step 1: Add Test Users to Database

### Go to Supabase SQL Editor
https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc/editor

### Run This SQL

Copy and paste from `add_test_users.sql` or use this:

```sql
-- Admin User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email)
VALUES ('admin', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', 'System Administrator', 'male', '012-345-678', 'admin@ksit.edu.kh')
ON CONFLICT (email) DO NOTHING;

-- Manager User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email)
VALUES ('manager', 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', 'Dormitory Manager', 'female', '012-345-679', 'manager@ksit.edu.kh')
ON CONFLICT (email) DO NOTHING;

-- Teacher User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email)
VALUES ('teacher', 'គ្រូបង្រៀន សូម៉ា', 'Teacher Soma', 'male', '012-345-680', 'teacher@ksit.edu.kh')
ON CONFLICT (email) DO NOTHING;

-- Student User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email)
VALUES ('student', 'និស្សិត វិចិត្រ', 'Student Vichit', 'male', '012-345-681', 'student@ksit.edu.kh')
ON CONFLICT (email) DO NOTHING;
```

Click **RUN** or press Ctrl+Enter

---

## 🎯 Step 2: Test Login

### Go to Frontend
http://localhost:3000

### Click "Login"

### Try These Credentials:

#### 👤 Admin
- **Email:** `admin@ksit.edu.kh`
- **Password:** `admin123` (or any password!)
- **Role:** Select "Admin"

#### 👤 Manager
- **Email:** `manager@ksit.edu.kh`
- **Password:** `manager123` (or any password!)
- **Role:** Select "Manager"

#### 👤 Teacher
- **Email:** `teacher@ksit.edu.kh`
- **Password:** `teacher123` (or any password!)
- **Role:** Select "Teacher"

#### 👤 Student
- **Email:** `student@ksit.edu.kh`
- **Password:** `student123` (or any password!)
- **Role:** Select "Student"

---

## ✅ What to Expect

After login, you should be redirected to the role-specific dashboard:

- **Admin** → Red themed dashboard
- **Manager** → Purple themed dashboard
- **Teacher** → Green themed dashboard
- **Student** → Blue themed dashboard

---

## 🔍 Verify Users Exist

To check if users were created, run this in Supabase SQL Editor:

```sql
SELECT role, full_name_latin, email, created_at
FROM users
ORDER BY role;
```

Expected result: 4 users (admin, manager, teacher, student)

---

## ⚠️ Troubleshooting

### "Invalid credentials" error?

**Cause:** User doesn't exist in database
**Solution:** Run the INSERT SQL above

### Login works but shows blank page?

**Cause:** Dashboard component issue
**Solution:** Check browser console (F12) for errors

### Can't access Supabase?

**Cause:** API key issue
**Solution:** Check `backend/.env` has correct keys

---

## 🔒 Future: Real Authentication

To implement real password authentication:

### 1. Install bcrypt

```bash
cd backend
npm install bcrypt
```

### 2. Update Test Users with Hashed Passwords

```sql
-- Generate hash for "password123" (example)
-- In production, use bcrypt.hash() in Node.js

UPDATE users SET password_hash = '$2b$10$YourHashedPasswordHere' WHERE email = 'admin@ksit.edu.kh';
```

### 3. Update auth.controller.js

Uncomment the bcrypt verification code (line 56-58)

```javascript
const bcrypt = require('bcrypt');

// In login function:
const isPasswordValid = await bcrypt.compare(password, user.password_hash);

if (!isPasswordValid) {
  const error = new Error('Invalid credentials');
  error.statusCode = 401;
  return next(error);
}
```

---

## 📊 Current System Status

| Feature | Status |
|---------|--------|
| Database Schema | ✅ Created |
| Test Users | ⚠️ Need to add |
| Mock Login | ✅ Working |
| Real Password | ❌ Not implemented |
| JWT Tokens | ❌ Not implemented |

---

## 🎯 Quick Test Checklist

- [ ] Database schema created ✅ (You did this!)
- [ ] Test users added (Run SQL above)
- [ ] Frontend opens at localhost:3000
- [ ] Backend running at localhost:5000
- [ ] Can login with any password
- [ ] Redirected to correct dashboard

---

**For development: Use any password!**
**For production: Implement bcrypt password hashing**

---

Need help? Check the backend terminal for error messages!
