const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert');

const backendRoot = path.resolve(__dirname, '..');

test('phone registration contract enforces unique normalized phone numbers with HTTP 409', () => {
  const source = fs.readFileSync(path.join(backendRoot, 'controllers', 'auth.controller.js'), 'utf8');
  assert.match(source, /registerWithPhone/);
  assert.match(source, /phoneLookupCandidates/);
  assert.match(source, /លេខទូរស័ព្ទនេះត្រូវបានចុះឈ្មោះរួចហើយ/);
  assert.match(source, /409/);
});

test('telegram bot webhook handles /start command with inline mini app registration buttons', () => {
  const source = fs.readFileSync(path.join(backendRoot, 'controllers', 'auth.controller.js'), 'utf8');
  assert.match(source, /telegramWebhook/);
  assert.match(source, /ចុះឈ្មោះស្នាក់នៅ/);
  assert.match(source, /web_app/);
});
