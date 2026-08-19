const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('CMS RLS hardening migration retains server-side access while denying browser-role table access', () => {
  const migrationPath = path.resolve(
    __dirname,
    '..',
    '..',
    'supabase',
    'migrations',
    '20260818_site_settings_news_posts_rls_hardening.sql',
  );
  const migration = fs.readFileSync(migrationPath, 'utf8');

  for (const table of ['site_settings', 'news_posts']) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
    assert.match(migration, new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM PUBLIC;`));
    assert.match(migration, new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon, authenticated;`));
    assert.match(migration, new RegExp(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\\.${table} TO service_role;`));
  }

  assert.match(migration, /CREATE POLICY "Service role manages site settings"[\s\S]*?TO service_role/);
  assert.match(migration, /CREATE POLICY "Service role manages news posts"[\s\S]*?TO service_role/);
  assert.doesNotMatch(migration, /CREATE POLICY[\s\S]*?TO anon, authenticated/);
});
