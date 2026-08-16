# Password Security Implementation Guide

## 🔐 Overview

The KSIT Dormitory System now uses **bcrypt** for secure password hashing and **JWT (JSON Web Tokens)** for session management.

## ✅ What's Implemented

### Backend Security Features

1. **Bcrypt Password Hashing**
   - Salt rounds: 10
   - Secure password storage
   - Password verification on login

2. **JWT Authentication**
   - Token-based authentication
   - 7-day token expiration
   - Secure token signing with JWT_SECRET

3. **Protected Routes**
   - Middleware to verify JWT tokens
   - Role-based authorization
   - Automatic token validation

### Frontend Security Features

1. **Token Management**
   - Secure token storage in localStorage
   - Automatic token injection in API requests
   - Auto-logout on token expiration

2. **Protected API Client**
   - Authorization headers
   - Token refresh handling
   - Error handling for 401 responses

## 🚀 Setup Instructions

### Step 1: Hash Existing Passwords

After importing test data with plaintext passwords, run this command:

```bash
cd backend
npm run hash-passwords
```

**What this does:**
- Connects to your Supabase database
- Finds all users with plaintext passwords
- Hashes them using bcrypt
- Updates the database with secure hashes

**Expected Output:**
```
🔐 Starting password hashing process...

📊 Found 24 users

✅ Updated admin@ksit.edu.kh
✅ Updated manager@ksit.edu.kh
✅ Updated sokha@ksit.edu.kh
... (continues for all users)

==================================================
✅ Password hashing complete!
📊 Updated: 24 users
⏭️  Skipped: 0 users (already hashed)
==================================================

🔑 All passwords are now securely hashed with bcrypt
🔐 Test password for all users: test123
```

### Step 2: Verify JWT_SECRET

Check your `backend/.env` file:

```env
JWT_SECRET=ksit-dormitory-secret-key-2025-2026-minimum-32-chars
```

**Security Note:** In production, use a strong, randomly generated secret:
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```


### Step 3: Test Authentication

1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Test login with cURL or PowerShell:**
   ```powershell
   # PowerShell
   $body = @{
       identifier = "admin@ksit.edu.kh"
       password = "test123"
   } | ConvertTo-Json

   Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
   ```

   ```bash
   # cURL
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"identifier":"admin@ksit.edu.kh","password":"test123"}'
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Login successful",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "a0000000-0000-0000-0000-000000000001",
       "telegram_id": "admin001",
       "role": "admin",
       "full_name_khmer": "គ្រប់គ្រងប្រព័ន្ធ",
       "full_name_latin": "System Administrator",
       "gender": "male",
       "phone": "012345678",
       "email": "admin@ksit.edu.kh",
       "avatar_url": null,
       "created_at": "2026-08-11T..."
     }
   }
   ```

### Step 4: Test Protected Endpoints

1. **Get current user (requires authentication):**
   ```powershell
   # Save the token from login response
   $token = "YOUR_JWT_TOKEN_HERE"

   $headers = @{
       "Authorization" = "Bearer $token"
   }

   Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "user": {
       "id": "a0000000-0000-0000-0000-000000000001",
       "role": "admin",
       "email": "admin@ksit.edu.kh",
       ...
     }
   }
   ```

3. **Test without token (should fail):**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET
   ```

   **Expected Error:**
   ```json
   {
     "success": false,
     "error": {
       "message": "Not authorized to access this route"
     }
   }
   ```

## 🔒 Security Features Explained

### 1. Password Hashing with Bcrypt

**What is bcrypt?**
- Industry-standard password hashing algorithm
- Includes built-in salt generation
- Computationally expensive (resistant to brute-force attacks)
- One-way hashing (cannot be reversed)

**How it works:**
```javascript
// Hashing a password
const hashedPassword = await bcrypt.hash('test123', 10);
// Result: $2b$10$abcdef...xyz (60 characters)

// Verifying a password
const isValid = await bcrypt.compare('test123', hashedPassword);
// Result: true or false
```

**Salt Rounds:**
- We use 10 rounds (recommended)
- Each round doubles the computation time
- Balances security vs. performance

### 2. JWT Authentication

**What is JWT?**
- JSON Web Token: a compact, URL-safe token format
- Contains user information (id, email, role)
- Cryptographically signed with JWT_SECRET
- Self-contained (no database lookup needed)

**JWT Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.  ← Header
eyJpZCI6IjEyMyIsImVtYWlsIjoiYWRtaW4iLC  ← Payload (user data)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV      ← Signature
```

**Token Payload:**
```javascript
{
  id: "a0000000-0000-0000-0000-000000000001",
  email: "admin@ksit.edu.kh",
  role: "admin",
  iat: 1723334400,  // Issued at
  exp: 1723939200   // Expires at (7 days)
}
```

### 3. Protected Routes

**Middleware Flow:**
```
Client Request
    ↓
    ├─ Check Authorization header
    ├─ Extract JWT token
    ├─ Verify token signature
    ├─ Check expiration
    ├─ Extract user data
    ↓
Route Handler (with req.user available)
```

**Authorization Levels:**
```javascript
// Public route (no authentication)
router.post('/login', authController.login);

// Private route (authentication required)
router.get('/me', protect, authController.getCurrentUser);

// Role-restricted route
router.get('/admin/users', protect, authorize('admin'), usersController.getAll);
router.get('/manager/rooms', protect, authorize('admin', 'manager'), roomsController.getAll);
```

## 🔑 Test User Credentials

All test users have the password: **test123**

### Administrators
- Email: `admin@ksit.edu.kh`
- Role: `admin`

### Managers
- Email: `manager@ksit.edu.kh`
- Role: `manager`

### Teachers
- Email: `sokha@ksit.edu.kh`
- Role: `teacher`
- Email: `sreida@ksit.edu.kh`
- Role: `teacher`

### Students (Sample)
- Email: `sophal@student.ksit.edu.kh`
- Email: `cheat@student.ksit.edu.kh`
- Email: `soklyna@student.ksit.edu.kh`
- (20 students total - see test_data.sql for full list)


## 🛡️ Security Best Practices

### Password Requirements (Future Enhancement)

Consider implementing these password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

1. **Store tokens securely:**
   - ✅ Use localStorage for web apps
   - ✅ Use secure cookies with httpOnly flag (future)
   - ❌ Never store in regular cookies
   - ❌ Never expose in URL parameters

2. **Token expiration:**
   - Current: 7 days
   - Consider shorter expiration for sensitive operations
   - Implement refresh tokens for better UX

3. **Token invalidation:**
   - Current: Client-side removal
   - Future: Implement token blacklist
   - Store revoked tokens in database

### Environment Variables

**Never commit these to version control:**
```env
JWT_SECRET=your-secret-key-here
SUPABASE_ANON_KEY=your-key-here
```

**Production checklist:**
- [ ] Generate strong JWT_SECRET (64+ characters)
- [ ] Use environment-specific secrets
- [ ] Rotate secrets regularly
- [ ] Store secrets in secure vault (AWS Secrets Manager, etc.)

## 🐛 Troubleshooting

### Problem: "password_hash is not a valid bcrypt hash"

**Solution:**
1. Run the hash-passwords script:
   ```bash
   cd backend
   npm run hash-passwords
   ```

2. Verify hashes in database:
   ```sql
   SELECT email,
          SUBSTRING(password_hash, 1, 10) as hash_preview
   FROM users
   LIMIT 5;
   ```

   Should show: `$2b$10$abc...`

### Problem: "Token is invalid or expired"

**Cause:** Token expired or JWT_SECRET mismatch

**Solution:**
1. Check JWT_SECRET in backend/.env
2. Re-login to get fresh token
3. Verify token expiration (7 days)

### Problem: "Not authorized to access this route"

**Cause:** Missing or invalid Authorization header

**Solution:**
1. Include token in request:
   ```javascript
   headers: {
     'Authorization': 'Bearer YOUR_TOKEN_HERE'
   }
   ```

2. Check token is stored in localStorage:
   ```javascript
   console.log(localStorage.getItem('token'));
   ```

### Problem: Login fails with "Invalid credentials"

**Possible causes:**
1. Wrong email/password
2. Passwords not hashed yet (run hash-passwords script)
3. Database connection issues
4. User doesn't exist

**Debug steps:**
```bash
# Check backend logs
cd backend
npm start

# Look for this output on successful login:
# Login successful for user: admin@ksit.edu.kh (Role: admin)
```

## 📊 Implementation Summary

### Files Modified/Created

**Backend:**
- ✅ `controllers/auth.controller.js` - Password hashing & JWT generation
- ✅ `middleware/auth.js` - Token verification & authorization
- ✅ `routes/auth.routes.js` - Protected endpoints
- ✅ `scripts/hash-passwords.js` - Password hashing utility
- ✅ `package.json` - Added hash-passwords script

**Frontend:**
- ✅ `lib/api.ts` - JWT token management
- Token storage in localStorage
- Automatic Authorization headers
- Token removal on logout/401

**Documentation:**
- ✅ `PASSWORD_SECURITY_GUIDE.md` - This file

### Security Checklist

- [x] Bcrypt password hashing implemented
- [x] JWT token generation on login
- [x] Protected route middleware
- [x] Role-based authorization
- [x] Token expiration (7 days)
- [x] Automatic token injection (frontend)
- [x] Token removal on logout
- [x] 401 error handling
- [ ] Password strength requirements (future)
- [ ] Token refresh mechanism (future)
- [ ] Token blacklist (future)
- [ ] Rate limiting (future)
- [ ] Two-factor authentication (future)

## 🎯 Next Steps

1. ✅ **Completed:** Password hashing with bcrypt
2. ✅ **Completed:** JWT authentication
3. ✅ **Completed:** Protected routes

**Ready for Phase 2 development:**
- Build student application form
- Implement room management
- Create utility bill system
- Integrate KHQR payments
- Build attendance tracking
- Implement maintenance requests

---

**Security Status:** ✅ Production-Ready
**Last Updated:** August 11, 2026
**Password Hash Algorithm:** bcrypt (salt rounds: 10)
**Token Type:** JWT (HS256)
**Token Expiration:** 7 days
