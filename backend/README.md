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
```

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

- Password hashing with bcrypt is not yet implemented (mock authentication)
- JWT session management is planned for future implementation
- KHQR (Bakong QR) integration for student bill payments
- Magic QR codes for room door access and attendance tracking
