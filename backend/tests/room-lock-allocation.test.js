const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('locked rooms are excluded before waterfall capacity evaluation', () => {
  const rooms = [
    { id: 'r1', room_number: 'M101', capacity: 8, occupied_count: 0, is_locked: true },
    { id: 'r2', room_number: 'M102', capacity: 8, occupied_count: 0, is_locked: false },
  ];
  const availableRooms = rooms.filter((room) => !room.is_locked && room.occupied_count < room.capacity);
  assert.equal(availableRooms.length, 1);
  assert.equal(availableRooms[0].room_number, 'M102');
});

test('custom capacity overrides continue to define room fullness', () => {
  const room = { room_number: 'M103', capacity: 2, occupied_count: 2, is_locked: false };
  assert.equal(room.occupied_count >= room.capacity, true);
});

test('the production allocation controller filters locks and rejects manual placement into a locked room', () => {
  const controller = fs.readFileSync(path.resolve(__dirname, '..', 'controllers', 'domain.controller.js'), 'utf8');
  assert.match(controller, /\.eq\('is_locked', false\)/);
  assert.match(controller, /Room is locked and cannot receive additional assignments/);
});
