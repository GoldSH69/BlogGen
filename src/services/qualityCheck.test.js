import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNaverBlogQuality } from './qualityCheck.js';

const good = {
  titleProposals: ['무선충전기 비교 가이드 7종 정리본', '충전기 고르는 법 완전 정리 가이드', '무선충전기 궁금증 해결 완벽 가이드'],
  content: [
    '[📌 3줄 핵심 요약 브리핑]',
    '- 결론 문장입니다.',
    '📌 첫 번째 질문은 무엇인가요?',
    '답변 문단입니다.',
    '📌 두 번째 질문은 무엇인가요?',
    '답변 문단입니다.',
    '📌 세 번째 질문은 무엇인가요?',
    '답변 문단입니다.',
    '📌 네 번째 질문은 무엇인가요?',
    '답변 문단입니다.',
    '| 항목 | 내용 |',
    '| --- | --- |',
    '| 출력 | 15W |',
  ].join('\n'),
  hashtags: ['a', 'b', 'c', 'd', 'e'],
  faq: [{ q: 'Q1', a: 'A1' }],
};

test('well-formed draft passes structural checks', () => {
  const { score, results } = checkNaverBlogQuality(good);
  assert.equal(score, 100);
  assert.ok(results.every(r => r.status === 'PASS'));
});

test('missing briefing and duplicated faq fail', () => {
  const { score, results } = checkNaverBlogQuality({ ...good, content: '📌 a\n[자주 묻는 질문]\nQ: x' });
  const byName = Object.fromEntries(results.map(r => [r.item, r.status]));
  assert.equal(byName['3줄 핵심 요약 브리핑'], 'FAIL');
  assert.equal(byName['FAQ 중복 방지'], 'FAIL');
  assert.ok(score < 100);
});

test('unverified numeric patterns warn with matches', () => {
  const { results } = checkNaverBlogQuality({ ...good, content: `${good.content}\n사용자 100여 명과 평점 4점 확인` });
  const check = results.find(r => r.item === '미확인 수치 표현 점검');
  assert.equal(check.status, 'WARN');
  assert.ok(check.desc.includes('100여 명') && check.desc.includes('평점 4'));
});

test('title length boundaries are enforced per proposal', () => {
  const titles = ['123456789012345678', '1234567890123456789012345', '12345678901234567'];
  const { results } = checkNaverBlogQuality({ ...good, titleProposals: titles });
  const statuses = results.filter(r => r.item.startsWith('추천 제목')).map(r => r.status);
  assert.deepEqual(statuses, ['PASS', 'PASS', 'WARN']);
});

test('empty draft fails without throwing', () => {
  const { score, results } = checkNaverBlogQuality({});
  assert.ok(score >= 0 && score <= 100);
  assert.ok(results.some(r => r.status === 'FAIL'));
});
