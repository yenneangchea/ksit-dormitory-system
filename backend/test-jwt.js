/**
 * Simple script to test JWT authentication
 * Run: node test-jwt.js
 */

require('dotenv').config();
const { hashPassword } = require('./controllers/auth.controller');

async function testHashPassword() {
  console.log('\n📝 Testing Password Hashing\n');

  const passwords = ['admin123', 'manager123', 'teacher123', 'student123'];

  for (const password of passwords) {
    const hash = await hashPassword(password);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}\n`);
  }

  console.log('✅ Copy these hashes to update your users in Supabase!\n');
  console.log('SQL Example:');
  console.log(`UPDATE users SET password_hash = 'YOUR_HASH_HERE' WHERE email = 'admin@ksit.edu.kh';`);
}

testHashPassword();
