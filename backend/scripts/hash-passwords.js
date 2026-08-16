/**
 * Script to hash passwords for existing users in database
 * Run this once after importing test_data.sql to convert plaintext passwords to bcrypt hashes
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function updateUsersPasswords() {
  try {
    console.log('🔐 Starting password hashing process...\n');

    // Fetch all users with plaintext password 'test123'
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password_hash');

    if (error) {
      console.error('❌ Error fetching users:', error);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database');
      process.exit(0);
    }

    console.log(`📊 Found ${users.length} users\n`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
      if (user.password_hash && (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$'))) {
        console.log(`⏭️  Skipping ${user.email} - already hashed`);
        skipped++;
        continue;
      }

      // Hash the password 'test123'
      const hashedPassword = await hashPassword('test123');

      // Update user in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Error updating ${user.email}:`, updateError);
      } else {
        console.log(`✅ Updated ${user.email}`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Password hashing complete!`);
    console.log(`📊 Updated: ${updated} users`);
    console.log(`⏭️  Skipped: ${skipped} users (already hashed)`);
    console.log('='.repeat(50));
    console.log('\n🔑 All passwords are now securely hashed with bcrypt');
    console.log('🔐 Test password for all users: test123\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
updateUsersPasswords();
