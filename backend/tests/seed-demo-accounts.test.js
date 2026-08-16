const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const test = require('node:test');
const { APPROVED_DEMO_PASSWORDS, loadPasswords, seedDemoAccounts } = require('../scripts/seed-demo-accounts');

test('seeds all four authorized demo accounts with bcrypt hashes rather than plaintext passwords', async () => {
  let upsertedAccounts;
  const fakeSupabase = {
    from(table) {
      assert.equal(table, 'users');
      return {
        upsert(accounts) {
          upsertedAccounts = accounts;
          return {
            select() {
              return Promise.resolve({ data: accounts.map(({ email, role }) => ({ id: email, email, role })), error: null });
            },
          };
        },
      };
    },
  };
  const passwords = {
    'admin@ksit.edu.kh': 'test-admin-password',
    'manager@ksit.edu.kh': 'test-manager-password',
    'teacher@ksit.edu.kh': 'test-teacher-password',
    'student@ksit.edu.kh': 'test-student-password',
  };

  const result = await seedDemoAccounts({ supabase: fakeSupabase, passwords });

  assert.equal(result.length, 4);
  assert.equal(upsertedAccounts.length, 4);
  await Promise.all(upsertedAccounts.map((account) => bcrypt.compare(passwords[account.email], account.password_hash).then((matches) => assert.equal(matches, true))));
  assert.ok(upsertedAccounts.every((account) => account.password_hash !== passwords[account.email]));
  assert.ok(upsertedAccounts.every((account) => /^\$2[aby]\$10\$/.test(account.password_hash)));
});

test('uses the documented standard demo passwords when overrides are not supplied', () => {
  assert.deepEqual(loadPasswords({}), APPROVED_DEMO_PASSWORDS);
});
