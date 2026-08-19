const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');

test('production diagnostic script checks the single-domain Vercel health and authentication routes', () => {
  const diagnostic = fs.readFileSync(path.join(backendRoot, 'tests', 'live-diagnostic.mjs'), 'utf8');
  assert.match(diagnostic, /https:\/\/ksit-dorm\.vercel\.app/);
  assert.match(diagnostic, /ksit-dorm\.vercel\.app\/api/);
  assert.match(diagnostic, /\$\{baseUrl\}\/health/);
  assert.match(diagnostic, /\$\{baseUrl\}\/auth\/login/);
});

test('backend server app exposes API routes and CORS', () => {
  const appJs = fs.readFileSync(path.join(backendRoot, 'app.js'), 'utf8');
  assert.match(appJs, /\/api\/auth/);
  assert.match(appJs, /cors/);
});
