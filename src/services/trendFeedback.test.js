import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotKey, recordSnapshot, getFeedback, setFeedback } from './trendFeedback.js';

function fakeStorage(initial = {}) {
  let data = { ...initial };
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _data: () => data,
  };
}

test('first snapshot has no delta, second snapshot measures gain', () => {
  const storage = fakeStorage();
  const first = recordSnapshot(storage, 'link:1', { sympathyCnt: 10, commentCnt: 2, at: '2026-09-17T10:00:00.000Z' });
  assert.equal(first.previous, null);
  assert.equal(first.delta.confidence, 'unobserved');
  const second = recordSnapshot(storage, 'link:1', { sympathyCnt: 16, commentCnt: 5, at: '2026-09-17T12:00:00.000Z' });
  assert.equal(second.elapsedHours, 2);
  assert.deepEqual([second.delta.sympathyGain, second.delta.commentGain, second.delta.velocityScore], [6, 3, 12]);
});

test('corrupt stored snapshots degrade to empty without throwing', () => {
  const storage = fakeStorage({ affiliwrite_trend_snapshots: 'not-json{' });
  const result = recordSnapshot(storage, 'link:2', { sympathyCnt: 1, commentCnt: 1, at: '2026-09-17T12:00:00.000Z' });
  assert.equal(result.previous, null);
  assert.equal(result.delta.confidence, 'unobserved');
});

test('feedback toggles like and dislike per key', () => {
  const storage = fakeStorage();
  assert.equal(getFeedback(storage, 'a'), null);
  assert.equal(setFeedback(storage, 'a', 'like'), 'like');
  assert.equal(setFeedback(storage, 'a', 'dislike'), 'dislike');
  assert.equal(setFeedback(storage, 'a', null), null);
});

test('snapshot keys prefer links and fall back to titles', () => {
  assert.equal(snapshotKey('https://m.blog.naver.com/a/1', '제목'), 'https://m.blog.naver.com/a/1');
  assert.equal(snapshotKey('#', '  제목  '), 'title:제목');
});
