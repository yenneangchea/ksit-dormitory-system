const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { calculateUtilitySubsidy } = require('../controllers/domain.controller');

test('utility subsidies make electricity and water free when usage remains within the room quotas', () => {
  const calculation = calculateUtilitySubsidy({
    electricity_used_kwh: 50,
    water_used_m3: 5,
    electricity_rate_khr: 800,
    water_rate_khr: 1500,
    trash_fee_khr: 10000,
    free_electricity_kwh: 50,
    free_water_m3: 5,
    active_students_count: 4,
  });

  assert.equal(calculation.chargeable_electricity_kwh, 0);
  assert.equal(calculation.chargeable_water_m3, 0);
  assert.equal(calculation.total_electric_cost_khr, 0);
  assert.equal(calculation.total_water_cost_khr, 0);
  assert.equal(calculation.total_amount_khr, 10000);
  assert.equal(calculation.split_amount_per_student_khr, 2500);
});

test('utility subsidies charge only usage above the free quota and round each KHQR amount upward to whole Riel', () => {
  const calculation = calculateUtilitySubsidy({
    electricity_used_kwh: 80,
    water_used_m3: 8,
    electricity_rate_khr: 800,
    water_rate_khr: 1500,
    trash_fee_khr: 10000,
    free_electricity_kwh: 50,
    free_water_m3: 5,
    active_students_count: 3,
  });

  assert.equal(calculation.subsidized_electricity_kwh, 50);
  assert.equal(calculation.chargeable_electricity_kwh, 30);
  assert.equal(calculation.subsidized_water_m3, 5);
  assert.equal(calculation.chargeable_water_m3, 3);
  assert.equal(calculation.total_electric_cost_khr, 24000);
  assert.equal(calculation.total_water_cost_khr, 4500);
  assert.equal(calculation.total_amount_khr, 38500);
  assert.equal(calculation.split_amount_per_student_khr, 12834);
});

test('utility subsidy calculator rejects invalid negative usage and zero resident room splits', () => {
  assert.throws(() => calculateUtilitySubsidy({
    electricity_used_kwh: -1,
    water_used_m3: 0,
    electricity_rate_khr: 800,
    water_rate_khr: 1500,
    trash_fee_khr: 10000,
    free_electricity_kwh: 50,
    free_water_m3: 5,
    active_students_count: 1,
  }), /cannot be lower/);
  assert.throws(() => calculateUtilitySubsidy({
    electricity_used_kwh: 0,
    water_used_m3: 0,
    electricity_rate_khr: 800,
    water_rate_khr: 1500,
    trash_fee_khr: 10000,
    free_electricity_kwh: 50,
    free_water_m3: 5,
    active_students_count: 0,
  }), /active residents/);
});

test('the deployed backend and portal surfaces include quota snapshots and subsidy transparency', () => {
  const root = path.resolve(__dirname, '..', '..');
  const backend = fs.readFileSync(path.join(root, 'backend', 'controllers', 'domain.controller.js'), 'utf8');
  const deployedBackend = fs.readFileSync(path.join(root, 'frontend', 'server', 'controllers', 'domain.controller.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'frontend', 'src', 'app', 'dashboard', 'admin', 'page.tsx'), 'utf8');
  const manager = fs.readFileSync(path.join(root, 'frontend', 'src', 'app', 'dashboard', 'manager', 'page.tsx'), 'utf8');
  const student = fs.readFileSync(path.join(root, 'frontend', 'src', 'app', 'dashboard', 'student', 'page.tsx'), 'utf8');

  for (const controller of [backend, deployedBackend]) {
    assert.match(controller, /calculateUtilitySubsidy/);
    assert.match(controller, /free_electricity_kwh/);
    assert.match(controller, /Math\.ceil\(totalAmount \/ activeStudents\)/);
    assert.match(controller, /utility_bills\(id, prev_electric_reading/);
  }
  assert.match(admin, /Free electricity quota \(kWh\/room\)/);
  assert.match(admin, /Free water quota \(m³\/room\)/);
  assert.match(manager, /UtilitySubsidyBreakdown/);
  assert.match(student, /UtilitySubsidyBreakdown/);
});
