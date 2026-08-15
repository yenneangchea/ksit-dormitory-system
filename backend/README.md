# KSIT Dormitory Management System - Backend API

Express.js backend API with Supabase (PostgreSQL) for the KSIT Dormitory Management System.

## Tech Stack

- **Node.js** + **Express.js** - REST API framework
- **Supabase** - PostgreSQL database with real-time capabilities
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Optional production-primary application-file storage.
# Set BOTH values only in the backend deployment secrets. When omitted, private
# Supabase Storage buckets remain the secure fallback.
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", "client_email":"...", "private_key":"..."}
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_google_drive_folder_id
```

### Google Drive Application Storage

The five-stage dormitory application lifecycle uses Google Drive as its primary document store when both Drive variables are present. The backend creates a deterministic folder hierarchy under the configured root:

```text
KSIT_Dormitory_Applications_2025_2026/
  [academic-year]/
    [student-id]_[student-khmer-name]/
      photo_4x6.*
      national_id.*
      family_book.*
      prefilled_application_form.pdf
      signed_thumbprinted_application.*
```

Enable the Google Drive API in the service account’s Google Cloud project, then grant that service account **Editor** access to the configured root folder. Document bytes are never stored in PostgreSQL. The database retains only Drive references and metadata, while Student, Manager, and Admin document access is streamed through authenticated API endpoints rather than public Drive URLs.

Apply the additive Google Drive metadata migration after setting a secure `KSIT_SUPABASE_DATABASE_URL` locally:

```bash
node scripts/run-google-drive-storage-migration.mjs
```

For production, place `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_DRIVE_ROOT_FOLDER_ID` in the backend deployment’s encrypted environment-variable settings; never commit either value or expose it in the Next.js browser bundle.

### 3. Run the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Health Check
- **GET** `/health` - Check API status

### Authentication
- **POST** `/api/auth/login` - User login
  - Body: `{ "identifier": "email or telegram_id", "password": "password", "role": "admin|manager|teacher|student" }`
- **POST** `/api/auth/logout` - User logout (TODO)
- **GET** `/api/auth/me` - Get current user (TODO)

## Project Structure

```
backend/
├── config/
│   └── supabase.js          # Supabase client configuration
├── controllers/
│   └── auth.controller.js   # Authentication logic
├── middleware/
│   └── errorHandler.js      # Global error handling
├── routes/
│   └── auth.routes.js       # Authentication routes
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── server.js                # Main application entry point
└── README.md
```

## Database Schema

The database schema is defined in `../system_design.md` and includes:

- **users** - User credentials and profiles (admin, manager, teacher, student)
- **academic_profiles** - Student academic information
- **buildings** - Dormitory buildings
- **rooms** - Dormitory rooms with Magic QR codes
- **room_applications** - Student dormitory applications
- **room_assignments** - Bed assignments
- **utility_bills** - Monthly utility bills per room
- **student_bills** - Individual student bills with KHQR codes
- **attendances** - Daily room attendance
- **maintenance_requests** - Maintenance tickets

## Notes

- Passwords are hashed with bcrypt and the API issues role-aware JWT sessions.
- Application documents are private. Google Drive files are proxied through authenticated lifecycle endpoints; Supabase fallback files use short-lived server-issued URLs.
- KHQR (Bakong QR) integration for student bill payments
- Magic QR codes for room door access and attendance tracking
