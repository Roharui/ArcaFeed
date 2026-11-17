import { articleWindow } from './article-window';
import { mergeStoredValue, needsMerge } from './storage-merge';
import {
  READING_HISTORY_KEY as HISTORY,
  READING_PROGRESS_KEY as PROGRESS,
  READING_LIST_PREFIX as LIST,
  readingListKey,
  SESSION_ARTICLE_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
} from './storage-keys';

export interface PendingWrite {
  base: string | null;
  value: string | null;
}

export const STORAGE_REVISION_KEY = '__storageRevision__';

function parse(raw: string | null | undefined): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** All reads, merges, budget enforcement and writes stay in this transaction. */
export function writeStorageBatch(
  store: IDBObjectStore,
  batch: ReadonlyMap<string, PendingWrite>,
): Map<string, string | null> {
  const committed = new Map<string, string | null>();
  const latest = new Map<string, string | null>();
  const reads = new Set([...batch.keys()].filter(needsMerge));
  reads.add(STORAGE_REVISION_KEY);
  if (batch.has(PROGRESS)) reads.add(HISTORY);
  if (batch.has(HISTORY)) reads.add(PROGRESS);
  const write = (key: string, value: string | null) => {
    committed.set(key, value);
    if (value === null) store.delete(key);
    else store.put(value, key);
  };
  const apply = () => {
    committed.set(
      STORAGE_REVISION_KEY,
      String(Number(latest.get(STORAGE_REVISION_KEY) ?? 0) + 1),
    );
    for (const [key, edit] of batch)
      committed.set(
        key,
        mergeStoredValue(key, edit.base, edit.value, latest.get(key) ?? null),
      );
    const history = parse(
      batch.has(HISTORY) ? committed.get(HISTORY) : latest.get(HISTORY),
    );
    const hasHistory =
      history?.version === 2 && Array.isArray(history.sessions);
    const sessions: { id: string; path: string; articleCount: number }[] =
      hasHistory ? history.sessions : [];
    const ids = new Set(sessions.map((session) => session.id));
    const listKeys = new Set([...ids].map(readingListKey));
    if (batch.has(HISTORY) && hasHistory && !batch.has(PROGRESS)) {
      const progress = parse(latest.get(PROGRESS));
      if (
        Array.isArray(progress) &&
        progress.some((item) => !ids.has(item?.id))
      )
        committed.set(
          PROGRESS,
          JSON.stringify(progress.filter((item) => ids.has(item?.id))),
        );
    }
    if (batch.has(HISTORY) && hasHistory) {
      let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
      for (const [index, session] of sessions.entries()) {
        const count = Math.max(
          1,
          Math.min(
            SESSION_ARTICLE_LIMIT,
            remaining - (sessions.length - index - 1),
          ),
        );
        const previous = session.articleCount;
        session.articleCount = Math.max(1, Math.min(previous || 1, count));
        remaining -= session.articleCount;
        if (previous <= session.articleCount) continue;
        const key = readingListKey(session.id);
        const trim = (raw: string | null, persist: boolean) => {
          const links = parse(raw);
          const value = JSON.stringify(
            articleWindow(
              Array.isArray(links)
                ? links.filter(
                    (link): link is string => typeof link === 'string',
                  )
                : [],
              session.path,
              session.articleCount,
            ),
          );
          if (persist) write(key, value);
          else committed.set(key, value);
        };
        const edit = batch.get(key);
        if (edit?.value) trim(edit.value, false);
        else {
          const request = store.get(key);
          request.onsuccess = () => trim(request.result ?? null, true);
        }
      }
      committed.set(HISTORY, JSON.stringify(history));
      const old = parse(latest.get(HISTORY));
      for (const session of Array.isArray(old?.sessions) ? old.sessions : [])
        if (typeof session?.id === 'string' && !ids.has(session.id))
          committed.set(readingListKey(session.id), null);
    }
    for (const [key, value] of [...committed]) {
      if (key.startsWith(LIST) && batch.has(HISTORY) && hasHistory) {
        const retained = listKeys.has(key);
        if (!retained) {
          write(key, null);
          continue;
        }
        // A stale eviction must not delete a session retained by the merge.
        if (value === null) {
          const request = store.get(key);
          request.onsuccess = () => committed.set(key, request.result ?? null);
          continue;
        }
      }
      if (key === PROGRESS && value !== null && hasHistory) {
        const progress = parse(value);
        if (Array.isArray(progress)) {
          write(
            key,
            JSON.stringify(progress.filter((item) => ids.has(item?.id))),
          );
          continue;
        }
      }
      write(key, value);
    }
  };
  let remaining = reads.size;
  for (const key of reads) {
    const request = store.get(key);
    request.onsuccess = () => {
      latest.set(key, request.result ?? null);
      if (--remaining === 0) {
        try {
          apply();
        } catch {
          store.transaction.abort();
        }
      }
    };
  }
  return committed;
}
