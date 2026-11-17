/** Rebase a cached edit onto the value read inside the write transaction. */
import {
  READING_HISTORY_KEY as HISTORY,
  READING_PROGRESS_KEY as PROGRESS,
  SESSION_LIMIT,
  ARTICLE_KEY_CACHE_LIMIT,
  RECENT_ARTICLE_KEYS_KEY,
} from './storage-keys';
const SET_KEYS = new Set(['arcaFeed:filterChannels', RECENT_ARTICLE_KEYS_KEY]);

export function needsMerge(key: string): boolean {
  return key === HISTORY || key === PROGRESS || SET_KEYS.has(key);
}

function parse(raw: string | null): any {
  try {
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function records(value: unknown): Record<string, any>[] {
  return Array.isArray(value)
    ? value.filter(
        (item) =>
          item && typeof item === 'object' && typeof item.id === 'string',
      )
    : [];
}

export function mergeStoredValue(
  key: string,
  baseRaw: string | null,
  nextRaw: string | null,
  latestRaw: string | null,
): string | null {
  if (nextRaw === null || !needsMerge(key) || baseRaw === latestRaw)
    return nextRaw;
  const base = parse(baseRaw);
  const next = parse(nextRaw);
  const latest = parse(latestRaw);
  if (SET_KEYS.has(key) && Array.isArray(next)) {
    const before = new Set(Array.isArray(base) ? base : []);
    const retained = new Set(next);
    const removed = new Set([...before].filter((id) => !retained.has(id)));
    const added = next.filter((id) => !before.has(id));
    const merged = [
      ...new Set([
        ...(key === RECENT_ARTICLE_KEYS_KEY ? next.slice(0, 1) : []),
        ...(Array.isArray(latest) ? latest : []).filter(
          (id) => !removed.has(id),
        ),
        ...added,
      ]),
    ];
    return JSON.stringify(
      key === RECENT_ARTICLE_KEYS_KEY
        ? merged.slice(0, ARTICLE_KEY_CACHE_LIMIT)
        : merged,
    );
  }
  const history = key === HISTORY;
  if (history && next?.version !== 2) return nextRaw;
  if (!history && !Array.isArray(next)) return nextRaw;
  const before = new Map(
    records(history ? base?.sessions : base).map((item) => [item.id, item]),
  );
  const after = records(history ? next.sessions : next);
  const retained = new Set(after.map((item) => item.id));
  const current = new Map(
    records(history ? latest?.sessions : latest).map((item) => [item.id, item]),
  );
  const evicting =
    history &&
    after.length >= SESSION_LIMIT &&
    after.some((item) => !before.has(item.id));
  for (const [id, original] of before) {
    if (retained.has(id)) continue;
    // An automatic eviction based on an old snapshot cannot remove a newly pinned item.
    if (evicting && !original.pinned && current.get(id)?.pinned) continue;
    current.delete(id);
  }
  for (const item of after) {
    const original = before.get(item.id);
    const existing = current.get(item.id);
    // A stale checkpoint or rename must not resurrect a deleted session.
    if (history && original && !existing) continue;
    if (!history && existing && existing.updatedAt > item.updatedAt) continue;
    if (
      original &&
      !existing &&
      JSON.stringify(original) === JSON.stringify(item)
    )
      continue;
    const merged = { ...(existing ?? original) };
    for (const field of new Set([
      ...Object.keys(original ?? {}),
      ...Object.keys(item),
    ])) {
      if (JSON.stringify(original?.[field]) === JSON.stringify(item[field]))
        continue;
      if (Object.prototype.hasOwnProperty.call(item, field))
        merged[field] = item[field];
      else delete merged[field];
    }
    if (!original && !existing) current.set(item.id, item);
    else current.set(item.id, merged);
  }
  const order = new Map(after.map((item, index) => [item.id, index]));
  const merged = [...current.values()]
    .sort(
      (a, b) =>
        (history ? Number(!!b.pinned) - Number(!!a.pinned) : 0) ||
        b.updatedAt - a.updatedAt ||
        (order.get(a.id) ?? SESSION_LIMIT) - (order.get(b.id) ?? SESSION_LIMIT),
    )
    .slice(0, SESSION_LIMIT);
  return JSON.stringify(history ? { version: 2, sessions: merged } : merged);
}
