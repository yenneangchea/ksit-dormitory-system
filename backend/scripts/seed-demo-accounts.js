const path = require('path');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/supabase');

const APPROVED_DEMO_PASSWORDS = Object.freeze({
  'admin@ksit.edu.kh': 'Admin@123',
  'manager@ksit.edu.kh': 'Manager@123',
  'teacher@ksit.edu.kh': 'Teacher@123',
  'student@ksit.edu.kh': 'Student@123',
});

const ACCOUNT_DEFINITIONS = [
  { role: 'admin', email: 'admin@ksit.edu.kh', passwordKey: 'KSIT_DEMO_ADMIN_PASSWORD', full_name_khmer: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ KSIT', full_name_latin: 'KSIT System Administrator', gender: 'male', phone: '010000001' },
  { role: 'manager', email: 'manager@ksit.edu.kh', passwordKey: 'KSIT_DEMO_MANAGER_PASSWORD', full_name_khmer: 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', full_name_latin: 'KSIT Dormitory Manager', gender: 'male', phone: '010000002' },
  { role: 'teacher', email: 'teacher@ksit.edu.kh', passwordKey: 'KSIT_DEMO_TEACHER_PASSWORD', full_name_khmer: 'គ្រូបន្ទុកអន្តេវាសិកដ្ឋាន', full_name_latin: 'KSIT Dormitory Teacher', gender: 'female', phone: '010000003' },
  { role: 'student', email: 'student@ksit.edu.kh', passwordKey: 'KSIT_DEMO_STUDENT_PASSWORD', full_name_khmer: 'និស្សិតសាកល្បង KSIT', full_name_latin: 'KSIT Demo Student', gender: 'female', phone: '010000004' },
];

function loadPasswords(source = process.env) {
  return Object.fromEntries(ACCOUNT_DEFINITIONS.map((account) => {
    const password = source[account.passwordKey] || APPROVED_DEMO_PASSWORDS[account.email];
    return [account.email, password];
  }));
}

async function seedDemoAccounts({ supabase = getSupabase(), passwords = loadPasswords() } = {}) {
  const accounts = await Promise.all(ACCOUNT_DEFINITIONS.map(async ({ passwordKey, ...account }) => ({
    ...account,
    password_hash: await bcrypt.hash(passwords[account.email], 10),
  })));

  const { data, error } = await supabase
    .from('users')
    .upsert(accounts, { onConflict: 'email' })
    .select('id, email, role');
  if (error) throw error;

  return data;
}

async function main() {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
  const accounts = await seedDemoAccounts();
  console.log(JSON.stringify({ seeded: true, accounts: accounts.map(({ email, role }) => ({ email, role })) }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ seeded: false, error: error.message }));
    process.exit(1);
  });
}

module.exports = { ACCOUNT_DEFINITIONS, APPROVED_DEMO_PASSWORDS, loadPasswords, seedDemoAccounts };
