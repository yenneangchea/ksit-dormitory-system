# Supabase Database Setup

Your Supabase project is configured and ready. Follow these steps to set up the database schema.

## 📊 Project Details

- **Project URL:** https://ukdpgzbzrzosbxvsxifc.supabase.co
- **Project Ref:** ukdpgzbzrzosbxvsxifc
- **Status:** ✅ Connected

## 🔧 Database Schema Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc

2. Navigate to **SQL Editor** in the left sidebar

3. Click **+ New Query**

4. Open `system_design.md` in this project

5. Copy the **entire SQL schema** (starting from `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)

6. Paste it into the SQL Editor

7. Click **Run** (or press Ctrl/Cmd + Enter)

8. Wait for the execution to complete (should take 5-10 seconds)

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to your project
supabase link --project-ref ukdpgzbzrzosbxvsxifc

# Create migration file
supabase migration new initial_schema

# Copy the schema from system_design.md to the migration file
# Then push to database
supabase db push
```

## 📋 What Gets Created

The schema will create:

### Custom Types (ENUMs)
- `user_role`: admin, manager, teacher, student
- `gender_type`: male, female
- `building_gender_type`: male, female, mixed
- `application_status`: draft, submitted, under_review, approved, rejected, assigned
- `room_status`: available, full, maintenance
- `bill_status`: unpaid, paid, overdue
- `attendance_status`: present, absent, leave
- `maintenance_category`: electricity, plumbing, furniture, door_lock, internet, other
- `maintenance_urgency`: low, medium, high, emergency
- `maintenance_status`: open, in_progress, resolved, cancelled

### Tables (10 total)
1. **users** - User credentials and profiles
2. **academic_profiles** - Student academic information
3. **buildings** - Dormitory buildings
4. **rooms** - Room details with QR codes
5. **room_applications** - Student applications
6. **room_assignments** - Bed assignments
7. **utility_bills** - Room utility bills
8. **student_bills** - Individual student bills
9. **attendances** - Daily attendance
10. **maintenance_requests** - Maintenance tickets

### Triggers
- `update_room_occupancy()` - Automatically updates room status when assignments change

## 🧪 Creating Test Users

After schema setup, add test users:

```sql
-- Admin User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('admin', 'អ្នកគ្រប់គ្រង', 'Admin User', 'male', '012345678', 'admin@ksit.edu.kh', '$2b$10$test');

-- Manager User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('manager', 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', 'Dorm Manager', 'female', '012345679', 'manager@ksit.edu.kh', '$2b$10$test');

-- Teacher User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('teacher', 'គ្រូបង្រៀន', 'Teacher Name', 'male', '012345680', 'teacher@ksit.edu.kh', '$2b$10$test');

-- Student User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES ('student', 'និស្សិតធម្មតា', 'Student Name', 'male', '012345681', 'student@ksit.edu.kh', '$2b$10$test');
```

## 🔍 Verify Setup

Check if tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected output: 10 tables (attendances, academic_profiles, buildings, maintenance_requests, room_applications, room_assignments, rooms, student_bills, users, utility_bills)

## 🔐 Security Notes

1. **Row Level Security (RLS)** is enabled by default on Supabase
2. You may need to add RLS policies for each table based on your security requirements
3. The current setup uses the `anon` key which has limited permissions
4. For production, implement proper authentication and RLS policies

## 📱 Next Steps

1. ✅ Schema created
2. ✅ Test users added
3. ⬜ Configure RLS policies
4. ⬜ Add sample buildings and rooms
5. ⬜ Test the application

## 🛠️ Useful Supabase Commands

```bash
# View project status
supabase status

# View database migrations
supabase migration list

# Reset database (WARNING: deletes all data)
supabase db reset

# Backup database
supabase db dump -f backup.sql

# View real-time logs
supabase functions logs
```

## 🔗 Useful Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc
- **SQL Editor:** https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc/editor
- **Database:** https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc/database/tables
- **API Docs:** https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc/api
- **Authentication:** https://supabase.com/dashboard/project/ukdpgzbzrzosbxvsxifc/auth/users

## 💡 Connection Details

If you need to connect directly to PostgreSQL:

```
Host: db.ukdpgzbzrzosbxvsxifc.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Your Supabase Database Password]
```

**Note:** Find your database password in Supabase Dashboard > Settings > Database

---

**Environment Variables Already Configured:**
- ✅ Backend `.env` file created
- ✅ Frontend `.env.local` file created
- ✅ Both servers are connected to your Supabase project
