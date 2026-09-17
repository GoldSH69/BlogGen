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
