// Offline checks for the status mapping and plan rules: node tests/unit.test.js
const assert = require('node:assert/strict');
const { sanitizeStatus } = require('../services/geminiService');
const { effectivePlan, paidThrough } = require('../config/plans');

assert.equal(sanitizeStatus('Abnormal'), 'Abnormal');
assert.equal(sanitizeStatus('Below normal'), 'Low');
assert.equal(sanitizeStatus('Above Normal'), 'High');
assert.equal(sanitizeStatus('Normal'), 'Normal');
assert.equal(sanitizeStatus('Within normal limits'), 'Normal');
assert.equal(sanitizeStatus('HIGH'), 'High');
assert.equal(sanitizeStatus('Low'), 'Low');
assert.equal(sanitizeStatus(undefined), 'Unknown');

const now = new Date('2026-06-15T00:00:00Z');
const inDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const plan = (subscription) => effectivePlan(subscription, now);

assert.equal(plan({ plan: 'pro_monthly', status: 'active', renewsAt: inDays(10) }), 'pro_monthly');
assert.equal(plan({ plan: 'pro_monthly', status: 'active', renewsAt: inDays(-1) }), 'pro_monthly', 'late renewal grace');
assert.equal(plan({ plan: 'pro_monthly', status: 'active', renewsAt: inDays(-10) }), 'free');
assert.equal(plan({ plan: 'pro_monthly', status: 'active' }), 'free');
assert.equal(plan({ plan: 'pro_yearly', status: 'cancelled', renewsAt: inDays(5) }), 'pro_yearly');
assert.equal(plan({ plan: 'pro_yearly', status: 'cancelled', renewsAt: inDays(-1) }), 'free');
for (const status of ['refunded', 'disputed', 'expired']) {
  assert.equal(plan({ plan: 'pro_yearly', status, renewsAt: inDays(100) }), 'free', status);
}
assert.equal(plan(undefined), 'free');

const start = new Date('2026-01-10T00:00:00Z');
assert.deepEqual(paidThrough('pro_monthly', start, false, now), new Date('2026-02-10T00:00:00Z'));
assert.deepEqual(paidThrough('pro_monthly', start, true, now), new Date('2026-07-10T00:00:00Z'));
assert.deepEqual(paidThrough('pro_yearly', start, true, now), new Date('2027-01-10T00:00:00Z'));

console.log('unit tests passed');
