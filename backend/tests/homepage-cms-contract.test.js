const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('loads official Khmer fonts and exposes the global Kantumruy Pro token', () => {
  const layout = read('frontend/src/app/layout.tsx');
  const css = read('frontend/src/app/globals.css');
  assert.match(layout, /Kantumruy_Pro/);
  assert.match(layout, /Koulen/);
  assert.match(layout, /Moul/);
  assert.match(css, /--font-kantumruy-pro/);
});

test('provides shared Khmer portal localization and a persistent language selector', () => {
  const i18n = read('frontend/src/lib/i18n.ts');
  const shell = read('frontend/src/components/portal-shell.tsx');
  assert.match(i18n, /Welcome back, Admin Portal/);
  assert.match(i18n, /ផ្ទាំងអ្នកគ្រប់គ្រង/);
  assert.match(i18n, /ksit_language/);
  assert.match(shell, /data-ksit-dashboard/);
});

test('protects Homepage Editor and binds public CMS settings to the homepage', () => {
  const editor = read('frontend/src/app/dashboard/admin/homepage-editor/page.tsx');
  const homepage = read('frontend/src/app/page.tsx');
  assert.match(editor, /useRoleGuard\('admin'\)/);
  assert.match(editor, /homepage_hero/);
  assert.match(editor, /footer_contact/);
  assert.match(homepage, /settings\?\.homepage_hero/);
  assert.match(homepage, /settings\?\.footer_contact/);
});

test('returns extended CMS settings and news metadata from server-side APIs', () => {
  const controller = read('backend/controllers/domain.controller.js');
  assert.match(controller, /homepage_features/);
  assert.match(controller, /footer_contact/);
  assert.match(controller, /image_url/);
  assert.match(controller, /external_url/);
});
