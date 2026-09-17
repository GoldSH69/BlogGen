// Pure helpers for user-recorded publishing performance on history items.
// Values are entered manually by the user after publishing; never fabricated.

export function normalizePerformance(input = {}) {
  const num = v => {
    if (v === '' || v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : parseInt(String(v).replace(/,/g, ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const memo = typeof input.memo === 'string' ? input.memo.trim().slice(0, 200) : '';
  return { sympathy: num(input.sympathy), comments: num(input.comments), memo };
}

export function applyPerformance(historyList, id, perf) {
  if (!Array.isArray(historyList)) return [];
  const normalized = { ...normalizePerformance(perf), recordedAt: new Date().toISOString() };
  return historyList.map(item => (item && item.id === id ? { ...item, performance: normalized } : item));
}
