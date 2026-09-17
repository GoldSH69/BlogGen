// Deterministic structural checks for generated Naver blog drafts.
// Code-measured only: this score is NOT a Naver ranking or exposure prediction.

const FABRICATED_PATTERNS = [/\d+\s*여\s*명/g, /평점\s*\d+(\.\d+)?/g, /별점\s*\d+/g, /상위\s*\d+\s*%/g];

export function checkNaverBlogQuality(data = {}) {
  const content = typeof data.content === 'string' ? data.content : '';
  const titles = Array.isArray(data.titleProposals) ? data.titleProposals.filter(t => typeof t === 'string') : [];
  const hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
  const faq = Array.isArray(data.faq) ? data.faq : [];
  const results = [];
  const push = (item, status, desc) => results.push({ item, status, desc });

  const hasBriefing = content.includes('3줄 핵심 요약') || content.includes('[3줄 핵심 요약]');
  push('3줄 핵심 요약 브리핑', hasBriefing ? 'PASS' : 'FAIL', hasBriefing ? '서두 요약 박스가 관측됨' : '서두 요약 박스가 없음');

  const h2Count = content.split('\n').filter(line => /^\s*(📌|【)/.test(line)).length;
  push('질문형 H2 소제목 수', h2Count >= 4 && h2Count <= 6 ? 'PASS' : 'WARN', `${h2Count}개 관측(권장 4~6개)`);

  const tableLines = content.split('\n').filter(line => {
    const t = line.trim();
    return t.startsWith('|') && t.endsWith('|');
  }).length;
  push('마크다운 비교 표', tableLines >= 2 ? 'PASS' : 'WARN', tableLines >= 2 ? '표 구조가 관측됨' : '표 구조가 없음');

  const contentHasFaq = /자주 묻는 질문|FAQ/.test(content);
  push(
    'FAQ 중복 방지',
    faq.length > 0 && contentHasFaq ? 'FAIL' : 'PASS',
    faq.length > 0 && contentHasFaq ? 'FAQ가 본문과 배열에 중복됨' : 'FAQ가 배열로 분리됨(또는 FAQ 없음)'
  );

  const hits = [...new Set(FABRICATED_PATTERNS.flatMap(re => content.match(re) || []))].slice(0, 5);
  push(
    '미확인 수치 표현 점검',
    hits.length > 0 ? 'WARN' : 'PASS',
    hits.length > 0 ? `수동 확인 필요: ${hits.join(', ')}` : '인원수·평점 패턴 없음'
  );

  if (titles.length === 0) {
    push('추천 제목', 'FAIL', '제목 제안이 없음');
  } else {
    titles.slice(0, 3).forEach((title, i) => {
      const len = [...title].length;
      push(`추천 제목 ${i + 1} (${len}자)`, len >= 18 && len <= 25 ? 'PASS' : 'WARN', title.slice(0, 30));
    });
  }

  push('해시태그 수', hashtags.length >= 5 && hashtags.length <= 10 ? 'PASS' : 'WARN', `${hashtags.length}개(권장 5~10개)`);

  const score = results.reduce((acc, r) => acc - (r.status === 'FAIL' ? 20 : r.status === 'WARN' ? 5 : 0), 100);
  return { score: Math.max(0, score), results };
}
