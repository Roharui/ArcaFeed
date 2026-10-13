import type { StorageRepository } from './repository';

const MIN_BASE_LENGTH = 256;
const MAX_PENDING_ITEMS = 128;
const MAX_PENDING_BYTES = 16 * 1024;
export const APPEND_LIST_SUFFIX = ':pending';

interface PendingList {
  base: string;
  items: string[];
}

function stringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function startsWith(
  list: readonly string[],
  prefix: readonly string[],
): boolean {
  return (
    list.length >= prefix.length &&
    prefix.every((item, index) => list[index] === item)
  );
}

/** Append-only writes use a small durable journal; replacements keep the legacy array. */
export class AppendListStorage {
  private cache = new Map<
    string,
    {
      raw: string | null;
      pendingRaw: string | null;
      base: string;
      original: string[];
      list: string[];
    }
  >();

  constructor(private repo: StorageRepository) {}

  get(key: string): string[] {
    const raw = this.repo.getItem(key);
    const pendingRaw = this.repo.getItem(key + APPEND_LIST_SUFFIX);
    const cached = this.cache.get(key);
    if (cached?.raw === raw && cached.pendingRaw === pendingRaw)
      return cached.list;
    const value =
      cached?.raw === raw ? cached.original : this.repo.getJSON<unknown>(key);
    const original =
      cached?.raw === raw
        ? cached.original
        : Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string')
          : [];
    // A fingerprint binds additions to their original array, including legacy writes.
    // Compute it only when the base string changes, rather than on every append.
    let base = cached?.raw === raw ? cached.base : '';
    if (!base) {
      let hash = 2166136261;
      let second = 5381;
      for (let i = 0; i < (raw?.length ?? 0); i++) {
        const code = raw!.charCodeAt(i);
        hash = Math.imul(hash ^ code, 16777619);
        second = Math.imul(second, 33) ^ code;
      }
      base = `${raw?.length ?? 0}:${hash >>> 0}:${second >>> 0}`;
    }
    const pending = this.repo.getJSON<unknown>(key + APPEND_LIST_SUFFIX);
    const valid =
      pending &&
      typeof pending === 'object' &&
      'base' in pending &&
      pending.base === base &&
      'items' in pending &&
      stringArray(pending.items);
    const items = valid ? (pending as PendingList).items : [];
    const list = valid ? [...new Set([...original, ...items])] : original;
    this.cache.set(key, { raw, pendingRaw, base, original, list });
    return list;
  }

  set(key: string, next: string[], previous?: readonly string[]): void {
    const current = this.get(key);
    const cached = this.cache.get(key)!;
    const baseline = previous ?? current;
    const currentItems = new Set(current);
    const compatible =
      startsWith(current, baseline) ||
      (startsWith(baseline, cached.original) &&
        baseline
          .slice(cached.original.length)
          .every((item) => currentItems.has(item)));
    if (
      startsWith(next, baseline) &&
      compatible &&
      cached.original.length >= MIN_BASE_LENGTH
    ) {
      // Merge additions with the latest journal so sequential writes from other tabs survive.
      const seen = new Set(current);
      const additions = next.slice(baseline.length).filter((item) => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
      if (!additions.length) return;
      const items = [...current.slice(cached.original.length), ...additions];
      const pending: PendingList = { base: cached.base, items };
      const raw = JSON.stringify(pending);
      if (
        items.length < MAX_PENDING_ITEMS &&
        raw.length * 2 < MAX_PENDING_BYTES
      ) {
        this.repo.setItem(key + APPEND_LIST_SUFFIX, raw);
        return;
      }
      next = [...current, ...additions];
    }
    this.repo.setJSON(key, next);
    // Delete only the journal observed for this write, never a newer payload.
    if (this.repo.getItem(key + APPEND_LIST_SUFFIX) === cached.pendingRaw) {
      this.repo.removeItem(key + APPEND_LIST_SUFFIX);
    }
    this.cache.delete(key);
  }
}
