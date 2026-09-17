import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePerformance, applyPerformance } from './historyPerformance.js';

test('performance input normalizes numbers and trims memo', () => {
  assert.deepEqual(normalizePerformance({ sympathy: '1,200', comments: 30, memo: '  저녁 발행  ' }), {
    sympathy: 1200,
    comments: 30,
    memo: '저녁 발행',
  });
  assert.deepEqual(normalizePerformance({ sympathy: '-5', comments: 'x' }), { sympathy: null, comments: null, memo: '' });
});

test('apply performance updates only the matching item', () => {
  const list = [{ id: 1, title: 'a' }, { id: 2, title: 'b', performance: { sympathy: 1 } }];
  const next = applyPerformance(list, 1, { sympathy: 10, comments: 2, memo: '' });
  assert.equal(next[0].performance.sympathy, 10);
  assert.equal(typeof next[0].performance.recordedAt, 'string');
  assert.deepEqual(next[1].performance, { sympathy: 1 });
  assert.deepEqual(applyPerformance(list, 99, { sympathy: 1 }), list);
});

test('malformed history degrades to empty list', () => {
  assert.deepEqual(applyPerformance(null, 1, {}), []);
  assert.deepEqual(applyPerformance({}, 1, {}), []);
});
