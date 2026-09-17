import test from 'node:test';
import assert from 'node:assert/strict';
import { rankTrend, keywordList, parseTrendMetadata } from './trendRanking.js';
import crawler from '../../scripts/trend-crawler.cjs';

const now = Date.parse('2026-09-17T12:00:00Z');

test('equal reactions rank recent material above older material', () => {
  const base = { sympathyCnt: 30, commentCnt: 12 };
  const recent = rankTrend({ ...base, publishedAt: '2026-09-17T11:00:00Z' }, {}, now);
  const older = rankTrend({ ...base, publishedAt: '2026-09-14T12:00:00Z' }, {}, now);
  assert.equal(recent.ageHours, 1);
  assert.equal(older.ageHours, 72);
  assert.ok(recent.score > older.score);
});

test('missing, invalid and future dates receive no freshness bonus', () => {
  const base = { sympathyCnt: 30, commentCnt: 12 };
  const missing = rankTrend(base, {}, now);
  for (const publishedAt of ['invalid', '2026-09-18T12:00:00Z']) {
    const result = rankTrend({ ...base, publishedAt }, {}, now);
    assert.equal(result.ageHours, null);
    assert.equal(result.score, missing.score);
    assert.equal(result.confidence, 'partial');
  }
  assert.equal(missing.ageHours, null);
});

test('Korean local timestamps are interpreted as KST', () => {
  const result = rankTrend({ pubDate: '2026-09-17 20:00' }, {}, now);
  assert.equal(result.ageHours, 1);
});

test('keywords normalize, deduplicate and tolerate malformed values', () => {
  assert.deepEqual(keywordList(' AI, 자취\n ai, '), ['ai', '자취']);
  assert.deepEqual(keywordList([null, 3, ' AI ']), ['ai']);
  assert.deepEqual(keywordList({}), []);
  assert.equal(rankTrend(null, null, now).engagement, null);
});

test('preferences and configurable reaction weights affect ranking', () => {
  const post = { title: '자취 AI 도구', sympathyCnt: 10, commentCnt: 5 };
  const base = rankTrend(post, {}, now);
  const preferred = rankTrend(post, { preferredKeywords: ['ai'], commentWeight: 4 }, now);
  assert.equal(preferred.engagement, 30);
  assert.ok(preferred.score > base.score);
  assert.equal(rankTrend(post, { excludedKeywords: ['자취'] }, now).eligible, false);
  assert.equal(rankTrend(post, { sympathyWeight: 0, commentWeight: 0 }, now).engagement, 0);
  assert.equal(rankTrend({ sympathyCnt: -1, commentCnt: NaN }, {}, now).engagement, null);
});

test('metadata is backward compatible and missing metrics stay unknown', () => {
  assert.equal(parseTrendMetadata('legacy body'), null);
  assert.equal(parseTrendMetadata('<!-- TREND_METADATA_START -->invalid<!-- TREND_METADATA_END -->'), null);
  const data = { version: 1, title: 'AI 도구', sympathyCnt: null, commentCnt: 0 };
  const parsed = parseTrendMetadata(`<!-- TREND_METADATA_START -->${JSON.stringify(data)}<!-- TREND_METADATA_END -->`);
  assert.deepEqual(parsed, data);
  assert.equal(rankTrend(parsed, {}, now).confidence, 'partial');
});

test('crawler distinguishes unavailable reactions from measured zero', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }));
  assert.deepEqual(await crawler.fetchNaverBlogReactions('https://blog.naver.com/example/123'), { sympathyCnt: null, commentCnt: null });
});

test('crawler extracts content before stripping markup', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => '<div class="se-main-container"><div>실제 본문<br>두 번째 문장</div></div>' }));
  assert.equal(await crawler.scrapeFullText('https://blog.naver.com/example/123', '네이버 블로그'), '실제 본문\n두 번째 문장');
  assert.equal(crawler.formatPubDate('2026-09-17T21:00:00+09:00'), '2026-09-17T12:00:00.000Z');
});
