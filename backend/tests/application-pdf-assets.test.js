const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const test = require('node:test');
const { __private } = require('../controllers/application-lifecycle.controller');

test('official application PDF resolves the bundled Khmer font and logo assets', () => {
  assert.equal(existsSync(__private.resolvePdfAsset('fonts', 'KantumruyPro-Regular.ttf')), true);
  assert.equal(existsSync(__private.resolvePdfAsset('ksit-logo.png')), true);
});
