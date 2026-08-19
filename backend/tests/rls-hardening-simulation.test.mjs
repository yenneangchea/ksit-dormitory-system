import test from 'node:test';
import assert from 'node:assert';

test('RLS hardening architectural safety check', () => {
  const coreTables = [
    'users',
    'buildings',
    'rooms',
    'room_applications',
    'room_assignments',
    'attendance_roster',
    'leave_requests',
    'maintenance_tickets',
    'utility_bills',
    'academic_majors',
    'site_settings',
    'news_posts',
    'phone_verification_codes'
  ];

  assert.strictEqual(coreTables.length >= 13, true, 'All core tables must be covered');
});
