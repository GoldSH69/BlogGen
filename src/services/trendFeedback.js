import { reactionDelta } from './trendRanking.js';

const SNAPSHOT_KEY = 'affiliwrite_trend_snapshots';
const FEEDBACK_KEY = 'affiliwrite_trend_feedback';

function safeStore(storage) {
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

function readMap(storage, key) {
  const store = safeStore(storage);
  if (!store) return {};
  try {
    const data = JSON.parse(store.getItem(key) || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeMap(storage, key, map) {
  const store = safeStore(storage);
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function snapshotKey(link, title) {
  if (typeof link === 'string' && link && link !== '#') return link;
  return `title:${typeof title === 'string' ? title.trim().slice(0, 80) : 'unknown'}`;
}

function normalizeSnap(snap = {}) {
  const num = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const at = typeof snap.at === 'string' && Number.isFinite(Date.parse(snap.at)) ? snap.at : new Date().toISOString();
  return { sympathyCnt: num(snap.sympathyCnt), commentCnt: num(snap.commentCnt), at };
}

export function peekVelocity(storage, key, snap = {}) {
  const map = readMap(storage, SNAPSHOT_KEY);
  const previous = map[key] || null;
  const current = normalizeSnap(snap);
  let elapsedHours = null;
  if (previous && Number.isFinite(Date.parse(previous.at))) {
    const hours = (Date.parse(current.at) - Date.parse(previous.at)) / 3600000;
    elapsedHours = hours > 0 ? hours : null;
  }
  const delta = previous
    ? reactionDelta(previous, current)
    : { sympathyGain: null, commentGain: null, velocityScore: null, confidence: 'unobserved' };
  return { previous, current, delta, elapsedHours };
}

export function recordSnapshot(storage, key, snap = {}) {
  const { previous, current, delta, elapsedHours } = peekVelocity(storage, key, snap);
  const map = readMap(storage, SNAPSHOT_KEY);
  map[key] = current;
  writeMap(storage, SNAPSHOT_KEY, map);
  return { previous, delta, elapsedHours };
}

export function readSnapshots(storage) {
  return readMap(storage, SNAPSHOT_KEY);
}

export function getFeedback(storage, key) {
  const map = readMap(storage, FEEDBACK_KEY);
  return map[key] === 'like' || map[key] === 'dislike' ? map[key] : null;
}

export function setFeedback(storage, key, value) {
  const map = readMap(storage, FEEDBACK_KEY);
  if (value === 'like' || value === 'dislike') {
    map[key] = value;
  } else {
    delete map[key];
  }
  writeMap(storage, FEEDBACK_KEY, map);
  return getFeedback(storage, key);
}

export function readFeedbacks(storage) {
  return readMap(storage, FEEDBACK_KEY);
}
