const count = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const weight = (value, fallback) => count(value) ?? fallback;

export function keywordList(value) {
  return [...new Set((Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,\n]/) : [])
    .filter(item => typeof item === 'string')
    .map(item => item.trim().toLocaleLowerCase()).filter(Boolean))].slice(0, 30);
}

export function rankTrend(post = {}, preferences = {}, now = Date.now()) {
  post = post && typeof post === 'object' ? post : {};
  preferences = preferences && typeof preferences === 'object' ? preferences : {};
  const text = `${post.title || ''} ${post.keyword || ''}`.toLocaleLowerCase();
  const preferred = keywordList(preferences.preferredKeywords).filter(word => text.includes(word));
  const excluded = keywordList(preferences.excludedKeywords).filter(word => text.includes(word));
  const sympathy = count(post.sympathyCnt);
  const comments = count(post.commentCnt);
  const engagement = sympathy === null && comments === null ? null
    : (sympathy ?? 0) * weight(preferences.sympathyWeight, 1) + (comments ?? 0) * weight(preferences.commentWeight, 2);
  const date = String(post.publishedAt || post.pubDate || '');
  const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00+09:00`
    : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date) ? `${date.replace(' ', 'T')}:00+09:00` : date;
  const timestamp = Date.parse(normalizedDate);
  const ageHours = Number.isFinite(timestamp) && timestamp <= now ? (now - timestamp) / 3600000 : null;
  const reactionPoints = engagement === null ? 0 : 45 * Math.min(1, Math.log1p(engagement) / Math.log1p(1000));
  const freshnessPoints = ageHours === null ? 0 : 30 * Math.exp(-ageHours / 72);
  const preferencePoints = Math.min(25, preferred.length * 12.5);
  const score = Math.round(reactionPoints + freshnessPoints + preferencePoints);
  return {
    version: 1,
    score,
    engagement,
    ageHours,
    preferred,
    excluded,
    eligible: excluded.length === 0,
    confidence: sympathy !== null && comments !== null && ageHours !== null ? 'observed' : 'partial',
    reasons: [
      `공감 ${sympathy === null ? '미확인' : sympathy} / 댓글 ${comments === null ? '미확인' : comments}`,
      ageHours === null ? '발행 시각 미확인' : `발행 후 약 ${Math.floor(ageHours)}시간`,
      preferred.length ? `관심 키워드: ${preferred.join(', ')}` : '관심 키워드 일치 없음',
    ],
  };
}

export function parseTrendMetadata(body) {
  if (typeof body !== 'string') return null;
  const match = body.match(/<!-- TREND_METADATA_START -->\s*([\s\S]*?)\s*<!-- TREND_METADATA_END -->/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    return data && data.version === 1 && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function reactionDelta(previous = {}, current = {}) {
  previous = previous && typeof previous === 'object' ? previous : {};
  current = current && typeof current === 'object' ? current : {};
  const num = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const prevSym = num(previous.sympathyCnt);
  const prevCom = num(previous.commentCnt);
  const curSym = num(current.sympathyCnt);
  const curCom = num(current.commentCnt);
  const sympathyGain = curSym === null || prevSym === null ? null : curSym - prevSym;
  const commentGain = curCom === null || prevCom === null ? null : curCom - prevCom;
  const gain = sympathyGain === null || commentGain === null ? null : sympathyGain + commentGain * 2;
  return {
    sympathyGain,
    commentGain,
    velocityScore: gain,
    confidence: gain === null ? 'unobserved' : 'observed',
  };
}

export function velocityBonus(delta = {}, elapsedHours = null) {
  const gain = delta && typeof delta.velocityScore === 'number' && Number.isFinite(delta.velocityScore) ? delta.velocityScore : null;
  const hours = typeof elapsedHours === 'number' && Number.isFinite(elapsedHours) && elapsedHours > 0 ? elapsedHours : null;
  if (gain === null || gain <= 0 || hours === null) return 0;
  const perHour = gain / hours;
  return Math.round(20 * Math.min(1, Math.log1p(perHour) / Math.log1p(100)));
}

export function suggestAngles(input = {}) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const sympathy = typeof input.sympathyCnt === 'number' && Number.isFinite(input.sympathyCnt) && input.sympathyCnt >= 0 ? input.sympathyCnt : null;
  const comments = typeof input.commentCnt === 'number' && Number.isFinite(input.commentCnt) && input.commentCnt >= 0 ? input.commentCnt : null;
  const rank = typeof input.dataLabRank === 'number' && Number.isFinite(input.dataLabRank) ? input.dataLabRank : null;
  const age = typeof input.ageHours === 'number' && Number.isFinite(input.ageHours) && input.ageHours >= 0 ? input.ageHours : null;
  const preferred = keywordList(input.preferredKeywords);
  const angles = [];
  if (comments !== null && sympathy !== null && comments >= 3 && comments >= sympathy * 0.5) {
    angles.push({ angle: '댓글 논쟁점 정리형', basis: `댓글 ${comments}개·공감 ${sympathy}개 관측 — 댓글에서 갈린 의견을 질문형 H2로 정리` });
  }
  if (rank !== null) {
    angles.push({ angle: '데이터랩 랭킹 비교형', basis: `데이터랩 ${rank}위 키워드 — 같은 키워드 상위 글의 공통 질문을 비교 표로 정리` });
  }
  if (age !== null && age <= 24 && sympathy !== null && sympathy >= 20) {
    angles.push({ angle: '최신 반응 속보형', basis: `발행 후 약 ${Math.floor(age)}시간·공감 ${sympathy}개 관측 — 빠르게 붙은 반응의 이유를 두괄식으로 정리` });
  }
  if (preferred.length > 0) {
    angles.push({ angle: '관심 키워드 심화형', basis: `관심 키워드 ${preferred.slice(0, 2).join(', ')} 일치 — 해당 관점의 체크리스트로 심화` });
  }
  if (angles.length === 0) {
    angles.push({ angle: '기본 비교·체크리스트형', basis: title ? `관측 근거 부족 — 제목 『${title.slice(0, 24)}』의 핵심 질문을 비교 표로 정리` : '관측 근거 부족 — 핵심 질문을 비교 표로 정리' });
  }
  return angles.slice(0, 3);
}
