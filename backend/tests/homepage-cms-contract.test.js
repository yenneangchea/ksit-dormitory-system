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

test('uses the requested dormitory identity with the streamlined public navigation', () => {
  const homepage = read('frontend/src/app/page.tsx');
  assert.match(homepage, /ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT/);
  assert.match(homepage, /KSIT DORMITORY MANAGEMENT SYSTEM/);
  assert.doesNotMatch(homepage, /> Dorm Portal</);
  assert.match(homepage, /អំពីវិទ្យាស្ថាន/);
  assert.match(homepage, /កម្មវិធីសិក្សា និងអាហារូបករណ៍/);
  assert.match(homepage, /href="\/about"/);
  assert.match(homepage, /https:\/\/ksit\.edu\.kh\/category\/scholarship\//);
  assert.match(homepage, /lg:hidden/);
  assert.doesNotMatch(homepage, /const roleWalkthrough/);
  assert.doesNotMatch(homepage, /Smart Campus Features/);
});

test('provides the dedicated Khmer features guide and links homepage learning actions to it', () => {
  const homepage = read('frontend/src/app/page.tsx');
  const featuresPage = read('frontend/src/app/features/page.tsx');
  assert.match(homepage, /href="\/features"/);
  assert.match(featuresPage, /អំពីប្រព័ន្ធអន្តេវាសិកដ្ឋានឌីជីថល/);
  assert.match(featuresPage, /ហេតុអ្វីចាំបាច់ត្រូវមានប្រព័ន្ធនេះ/);
  assert.match(featuresPage, /របៀបប្រើប្រាស់ប្រព័ន្ធតាមតួនាទី/);
  assert.match(featuresPage, /ចាប់ផ្តើមចូលប្រើប្រាស់ប្រព័ន្ធអន្តេវាសិកដ្ឋានថ្ងៃនេះ/);
});

test('provides public documentation and a data-driven changelog with consistent About System navigation', () => {
  const homepage = read('frontend/src/app/page.tsx');
  const featuresPage = read('frontend/src/app/features/page.tsx');
  const aboutPage = read('frontend/src/app/about/page.tsx');
  const docsPage = read('frontend/src/app/docs/page.tsx');
  const changelogPage = read('frontend/src/app/changelog/page.tsx');
  const changelogData = read('frontend/src/data/changelog.ts');

  assert.match(homepage, /អំពីប្រព័ន្ធ/);
  assert.match(homepage, /href="\/docs"/);
  assert.match(homepage, /href="\/changelog"/);
  assert.match(featuresPage, /អំពីប្រព័ន្ធ/);
  assert.match(featuresPage, /href="\/docs"/);
  assert.match(featuresPage, /href="\/changelog"/);
  assert.match(aboutPage, /អំពីវិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ/);
  assert.match(aboutPage, /គុណភាព និងភាពលេចធ្លោ/);
  assert.match(aboutPage, /ចូលទៅកាន់ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាន/);
  assert.match(changelogData, /v1\.3\.0/);
  assert.match(changelogData, /v1\.0\.0/);
  assert.match(changelogData, /changelogFilters/);
  assert.match(docsPage, /ទិដ្ឋភាពទូទៅ និងបេសកកម្មប្រព័ន្ធ/);
  assert.match(docsPage, /Next\.js 15/);
  assert.match(changelogPage, /៥ កំណែទម្រង់ចុងក្រោយ/);
  assert.match(changelogPage, /aria-pressed/);
});
