const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');

function request(server, pathName, headers = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = { host: '127.0.0.1', port: server.address().port, path: pathName, headers };
    http.get(requestOptions, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: JSON.parse(body) }));
    }).on('error', reject);
  });
}

test('public announcements return institutional content instead of 500 when Supabase is unavailable', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousAnonKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';

  const appPath = require.resolve('../app');
  const controllerPath = require.resolve('../controllers/domain.controller');
  const clientPath = require.resolve('../config/supabase');
  delete require.cache[appPath];
  delete require.cache[controllerPath];
  delete require.cache[clientPath];
  const app = require('../app');
  const server = app.listen(0);

  try {
    const response = await request(server, '/api/public/announcements', { Origin: 'https://ksit-dorm.vercel.app' });
    assert.equal(response.status, 200);
    assert.equal(response.headers['access-control-allow-origin'], 'https://ksit-dorm.vercel.app');
    assert.equal(response.headers['access-control-allow-credentials'], 'true');
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.ticker.text, '👉 ដំណឹងអាហារូបករណ៍ ២០០កន្លែង ឆ្នាំសិក្សា២០២៥-២០២៦');
    assert.equal(response.body.data.deadline.date, '2026-08-31');
    assert.equal(response.body.data.deadline.time, '17:00:00');
    assert.equal(response.body.data.deadline.action_link, '/login');
    assert.deepEqual(response.body.data.posts, []);
    assert.deepEqual(response.body.data.news_posts, []);
    assert.equal(response.body.data.settings.top_ticker.link, 'https://ksit.edu.kh/category/scholarship/');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
    if (previousAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previousAnonKey;
    delete require.cache[appPath];
    delete require.cache[controllerPath];
    delete require.cache[clientPath];
  }
});

test('announcements migration is additive, creates the CMS tables, and enables restricted public reads', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260816_public_announcements_resilience.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.site_settings/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.news_posts/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS ticker_text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS deadline_time/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS category/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS visibility/);
  assert.match(migration, /ALTER TABLE public\.site_settings ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE public\.news_posts ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /USING \(true\)/);
  assert.match(migration, /USING \(visibility = 'public'\)/);
  assert.match(migration, /ON CONFLICT \(setting_key\) DO NOTHING/);
});
