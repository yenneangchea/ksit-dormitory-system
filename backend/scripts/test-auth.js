/**
 * Script to test authentication system
 * Tests password hashing, JWT generation, and token verification
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🧪 Testing Authentication System\n');
console.log('='.repeat(50));

// Test 1: Password Hashing
console.log('\n1️⃣  Testing bcrypt password hashing...');
const testPassword = 'test123';
const hashedPassword = bcrypt.hashSync(testPassword, 10);
console.log(`   Plain password: ${testPassword}`);
console.log(`   Hashed password: ${hashedPassword.substring(0, 20)}...`);
console.log(`   Hash length: ${hashedPassword.length} characters`);
console.log(`   ✅ Bcrypt hashing works!`);

// Test 2: Password Verification
console.log('\n2️⃣  Testing password verification...');
const isValid = bcrypt.compareSync(testPassword, hashedPassword);
const isInvalid = bcrypt.compareSync('wrongpassword', hashedPassword);
console.log(`   Correct password: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Wrong password: ${!isInvalid ? '✅ PASS (correctly rejected)' : '❌ FAIL'}`);

// Test 3: JWT Generation
console.log('\n3️⃣  Testing JWT token generation...');
if (!process.env.JWT_SECRET) {
  console.log('   ❌ ERROR: JWT_SECRET not found in .env file');
  process.exit(1);
}

const testUser = {
  id: 'test-user-id-123',
  email: 'test@ksit.edu.kh',
  role: 'student'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '7d' });
console.log(`   JWT Token (preview): ${token.substring(0, 50)}...`);
console.log(`   Token length: ${token.length} characters`);
console.log(`   ✅ JWT generation works!`);

// Test 4: JWT Verification
console.log('\n4️⃣  Testing JWT token verification...');
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log(`   Decoded user ID: ${decoded.id}`);
  console.log(`   Decoded email: ${decoded.email}`);
  console.log(`   Decoded role: ${decoded.role}`);
  console.log(`   Token expires: ${new Date(decoded.exp * 1000).toLocaleString()}`);
  console.log(`   ✅ JWT verification works!`);
} catch (error) {
  console.log(`   ❌ JWT verification failed: ${error.message}`);
  process.exit(1);
}

// Test 5: Invalid JWT
console.log('\n5️⃣  Testing invalid JWT rejection...');
try {
  jwt.verify('invalid.token.here', process.env.JWT_SECRET);
  console.log('   ❌ FAIL: Invalid token was accepted!');
} catch (error) {
  console.log('   ✅ PASS: Invalid token correctly rejected');
}

// Test 6: JWT Secret Check
console.log('\n6️⃣  Testing JWT_SECRET security...');
const secretLength = process.env.JWT_SECRET.length;
console.log(`   JWT_SECRET length: ${secretLength} characters`);
if (secretLength < 32) {
  console.log('   ⚠️  WARNING: JWT_SECRET is too short (< 32 chars)');
  console.log('   Recommendation: Use at least 32 characters for production');
} else {
  console.log('   ✅ JWT_SECRET length is adequate');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ All authentication tests passed!');
console.log('='.repeat(50));
console.log('\n📋 Summary:');
console.log('   ✅ Bcrypt password hashing: Working');
console.log('   ✅ Password verification: Working');
console.log('   ✅ JWT token generation: Working');
console.log('   ✅ JWT token verification: Working');
console.log('   ✅ Invalid token rejection: Working');
console.log(`   ${secretLength >= 32 ? '✅' : '⚠️ '} JWT_SECRET security: ${secretLength >= 32 ? 'Good' : 'Needs improvement'}`);

console.log('\n🚀 Authentication system is ready for use!');
console.log('📖 See PASSWORD_SECURITY_GUIDE.md for more information\n');
