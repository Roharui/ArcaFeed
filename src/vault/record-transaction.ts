import {
  addressId,
  equalData,
  keyOf,
  mergeRecord,
  nextListVersion,
} from './record-schema';
import type {
  DataRow,
  RecordAddress,
  RecordEdit,
  RecordStore,
} from './record-schema';
import { articleWindow } from './article-window';
import {
  ARTICLE_KEY_CACHE_LIMIT,
  SESSION_LIMIT,
  SESSION_ARTICLE_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
} from './storage-keys';
export interface CommittedRecord extends RecordAddress {
  value: DataRow | undefined;
}
/** The transaction owns every read needed to validate or merge an operation. */
export function commitRecords(
  database: IDBDatabase,
  batch: readonly RecordEdit[],
  track: (tx: IDBTransaction) => void = () => {},
): Promise<CommittedRecord[]> {
  const scopes = new Set<RecordStore>(batch.map((edit) => edit.store));
  const resumeBudget = batch.some((edit) => edit.store === 'resumeSessions');
  const navigationBudget = batch.some(
    (edit) => edit.store === 'navigationSessions',
  );
  const positions = batch.filter(
    (edit) => edit.store === 'progress' && edit.value?.kind === 'resume',
  );
  if (positions.length) scopes.add('resumeSessions');
  if (resumeBudget || navigationBudget) {
    scopes.add('lists');
    scopes.add('progress');
  }
  return new Promise((resolve, reject) => {
    const tx = database.transaction([...scopes], 'readwrite');
    track(tx);
    const latest = new Map<string, CommittedRecord>();
    const changes = new Map<string, CommittedRecord>();
    let resumes: DataRow[] = [],
      navigation: DataRow[] = [],
      progress: DataRow[] = [];
    let outstanding = 0;
    let failure: unknown;
    const abort = (error: unknown) => {
      failure = error;
      try {
        tx.abort();
      } catch {
        /* already aborted */
      }
    };
    const read = (request: IDBRequest, done: (value: any) => void) => {
      outstanding++;
      request.onsuccess = () => {
        try {
          done(request.result);
          if (--outstanding === 0) apply();
        } catch (error) {
          abort(error);
        }
      };
    };
    const get = (address: RecordAddress) =>
      latest.get(addressId(address))?.value;
    const stage = (address: RecordAddress, value: DataRow | undefined) =>
      changes.set(addressId(address), { ...address, value });
    for (const edit of batch)
      read(tx.objectStore(edit.store).get(edit.key), (value) =>
        latest.set(addressId(edit), {
          store: edit.store,
          key: edit.key,
          value,
        }),
      );
    for (const edit of positions) {
      const address: RecordAddress = {
        store: 'resumeSessions',
        key: edit.value!.id,
      };
      read(tx.objectStore('resumeSessions').get(address.key), (value) =>
        latest.set(addressId(address), { ...address, value }),
      );
    }
    if (resumeBudget)
      read(tx.objectStore('resumeSessions').getAll(), (value) => {
        resumes = value;
        for (const row of value) {
          const address = { store: 'resumeSessions' as const, key: row.id };
          latest.set(addressId(address), { ...address, value: row });
        }
      });
    if (navigationBudget)
      read(tx.objectStore('navigationSessions').getAll(), (value) => {
        navigation = value;
        for (const row of value) {
          const address = { store: 'navigationSessions' as const, key: row.id };
          latest.set(addressId(address), { ...address, value: row });
        }
      });
    if (resumeBudget || navigationBudget)
      read(tx.objectStore('progress').getAll(), (value) => {
        progress = value;
        for (const row of value) {
          const address = {
            store: 'progress' as const,
            key: [row.kind, row.id] as [string, string],
          };
          latest.set(addressId(address), { ...address, value: row });
        }
      });
    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;
      for (const edit of batch) {
        if (edit.store === 'progress') continue;
        stage(edit, mergeRecord(edit, get(edit)));
      }
      for (const edit of batch.filter((edit) => edit.store === 'progress')) {
        let value = mergeRecord(edit, get(edit));
        if (edit.value?.kind === 'resume') {
          const address: RecordAddress = {
            store: 'resumeSessions',
            key: edit.value.id,
          };
          const parent = changes.has(addressId(address))
            ? changes.get(addressId(address))!.value
            : get(address);
          if (!parent || parent.path !== edit.value.path) value = get(edit);
          if (!parent) value = undefined;
          if (parent && get(edit)?.updatedAt > edit.value.updatedAt)
            value = get(edit);
        }
        stage(edit, value);
      }
      const overlay = (store: RecordStore, rows: DataRow[]) => {
        const result = new Map(
          rows.map((row) => [
            addressId({ store, key: keyOf(store, row) }),
            row,
          ]),
        );
        for (const [id, change] of changes)
          if (change.store === store) {
            if (change.value) result.set(id, change.value);
            else result.delete(id);
          }
        return [...result.values()];
      };
      const removeSession = (
        store: 'resumeSessions' | 'navigationSessions',
        id: string,
      ) => {
        const kind = store === 'resumeSessions' ? 'resume' : 'navigation';
        stage({ store, key: id }, undefined);
        stage({ store: 'lists', key: [kind, id] }, undefined);
        stage({ store: 'progress', key: [kind, id] }, undefined);
      };
      if (navigationBudget) {
        const rows = overlay('navigationSessions', navigation).sort(
          (a, b) =>
            b.lastUsedAt - a.lastUsedAt ||
            Number(
              changes.has(
                addressId({ store: 'navigationSessions', key: b.id }),
              ),
            ) -
              Number(
                changes.has(
                  addressId({ store: 'navigationSessions', key: a.id }),
                ),
              ),
        );
        for (const row of rows.slice(ARTICLE_KEY_CACHE_LIMIT))
          removeSession('navigationSessions', row.id);
        for (const edit of batch)
          if (
            edit.store === 'navigationSessions' &&
            !changes.get(addressId(edit))?.value
          )
            removeSession('navigationSessions', String(edit.key));
      }
      let trimming = 0;
      const finish = () => {
        if (trimming) return;
        for (const [token, change] of changes) {
          const original = latest.get(token)?.value;
          // Side effects not read individually (e.g. cascade deletion) are still persisted.
          if (latest.has(token) && equalData(original, change.value)) continue;
          const store = tx.objectStore(change.store);
          if (change.value) {
            change.value = {
              ...change.value,
              revision: (original?.revision ?? 0) + 1,
            };
            store.put(change.value);
          } else store.delete(change.key);
        }
      };
      if (resumeBudget) {
        const rows = overlay('resumeSessions', resumes);
        const effectiveProgress = overlay('progress', progress);
        const dates = new Map(
          effectiveProgress
            .filter((p) => p.kind === 'resume')
            .map((p) => [p.id, p.updatedAt]),
        );
        rows.sort(
          (a, b) =>
            Number(!!b.pinned) - Number(!!a.pinned) ||
            (dates.get(b.id) ?? b.updatedAt) -
              (dates.get(a.id) ?? a.updatedAt) ||
            Number(
              changes.has(addressId({ store: 'resumeSessions', key: b.id })),
            ) -
              Number(
                changes.has(addressId({ store: 'resumeSessions', key: a.id })),
              ),
        );
        const kept = rows.slice(0, SESSION_LIMIT);
        for (const row of rows.slice(SESSION_LIMIT))
          removeSession('resumeSessions', row.id);
        const ids = new Set(kept.map((row) => row.id));
        for (const edit of batch) {
          if (
            edit.store === 'resumeSessions' &&
            !changes.get(addressId(edit))?.value
          )
            removeSession('resumeSessions', String(edit.key));
          if (
            edit.store === 'lists' &&
            edit.value?.kind === 'resume' &&
            !ids.has(edit.value.id)
          )
            stage(edit, undefined);
        }
        for (const row of effectiveProgress)
          if (row.kind === 'resume' && !ids.has(row.id))
            stage({ store: 'progress', key: ['resume', row.id] }, undefined);
        let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
        kept.forEach((row, index) => {
          const limit = Math.max(
            1,
            Math.min(
              SESSION_ARTICLE_LIMIT,
              remaining - (kept.length - index - 1),
            ),
          );
          const count = Math.max(1, Math.min(row.articleCount || 1, limit));
          remaining -= count;
          if (row.articleCount <= count) return;
          const address: RecordAddress = {
            store: 'lists',
            key: ['resume', row.id],
          };
          const trim = (list: DataRow | undefined) => {
            const version = nextListVersion();
            const paths = articleWindow(
              Array.isArray(list?.paths) ? list.paths : [],
              row.path,
              count,
            );
            stage(address, { kind: 'resume', id: row.id, paths, version });
            stage(
              { store: 'resumeSessions', key: row.id },
              { ...row, articleCount: paths.length, listVersion: version },
            );
          };
          const staged = changes.get(addressId(address));
          if (staged?.value) trim(staged.value);
          else {
            trimming++;
            const request = tx.objectStore('lists').get(address.key);
            request.onsuccess = () => {
              try {
                trim(request.result);
                trimming--;
                finish();
              } catch (error) {
                abort(error);
              }
            };
          }
        });
      }
      // Reject a stale list update when its parent was deleted in another tab.
      if (resumeBudget)
        for (const edit of batch)
          if (edit.store === 'lists' && edit.value?.kind === 'resume') {
            const parent = {
              store: 'resumeSessions' as const,
              key: edit.value.id,
            };
            if (
              changes.has(addressId(parent)) &&
              !changes.get(addressId(parent))!.value
            )
              stage(edit, undefined);
          }
      finish();
    };
    tx.oncomplete = () => resolve([...changes.values()]);
    tx.onabort = () =>
      reject(failure ?? tx.error ?? new Error('IndexedDB transaction aborted'));
    tx.onerror = () => {};
  });
}
