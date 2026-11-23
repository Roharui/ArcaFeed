import {
  addressId,
  equalData,
  keyOf,
  mergeRecord,
  nextListVersion,
  sessionKind,
} from './record-schema';
import type {
  DataRow,
  RecordAddress,
  RecordEdit,
  RecordStore,
  SessionStore,
} from './record-schema';
import { articleWindow, sessionArticleLimit } from './article-window';
import {
  ARTICLE_KEY_CACHE_LIMIT,
  SESSION_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
} from './storage-keys';

export interface CommittedRecord extends RecordAddress {
  value: DataRow | undefined;
}

interface TransactionState {
  tx: IDBTransaction;
  batch: readonly RecordEdit[];
  latest: Map<string, CommittedRecord>;
  changes: Map<string, CommittedRecord>;
  stage: (address: RecordAddress, value: DataRow | undefined) => void;
  removeSession: (store: SessionStore, id: string) => void;
  abort: (error: unknown) => void;
}

function resolveScopes(batch: readonly RecordEdit[]): {
  scopes: RecordStore[];
  resumeBudget: boolean;
  navigationBudget: boolean;
  positions: RecordEdit[];
} {
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
  return {
    scopes: [...scopes],
    resumeBudget,
    navigationBudget,
    positions,
  };
}

function overlayRows(
  store: RecordStore,
  rows: readonly DataRow[],
  changes: ReadonlyMap<string, CommittedRecord>,
): DataRow[] {
  const result = new Map(
    rows.map((row) => [addressId({ store, key: keyOf(store, row) }), row]),
  );
  for (const [id, change] of changes) {
    if (change.store === store) {
      if (change.value) result.set(id, change.value);
      else result.delete(id);
    }
  }
  return [...result.values()];
}

function mergeProgressEdit(
  edit: RecordEdit,
  latest: ReadonlyMap<string, CommittedRecord>,
  changes: ReadonlyMap<string, CommittedRecord>,
): DataRow | undefined {
  const original = latest.get(addressId(edit))?.value;
  const value = mergeRecord(edit, original);
  if (edit.value?.kind !== 'resume') return value;

  const parentKey = addressId({ store: 'resumeSessions', key: edit.value.id });
  const parent = changes.has(parentKey)
    ? changes.get(parentKey)!.value
    : latest.get(parentKey)?.value;
  if (!parent) return undefined;
  if (parent.path !== edit.value.path) return original;
  if (original?.updatedAt > edit.value.updatedAt) return original;
  return value;
}

function enforceNavigationBudget(
  state: TransactionState,
  navigation: readonly DataRow[],
): void {
  const rows = overlayRows(
    'navigationSessions',
    navigation,
    state.changes,
  ).sort(
    (a, b) =>
      b.lastUsedAt - a.lastUsedAt ||
      Number(
        state.changes.has(
          addressId({ store: 'navigationSessions', key: b.id }),
        ),
      ) -
        Number(
          state.changes.has(
            addressId({ store: 'navigationSessions', key: a.id }),
          ),
        ),
  );
  for (const row of rows.slice(ARTICLE_KEY_CACHE_LIMIT))
    state.removeSession('navigationSessions', row.id);
  for (const edit of state.batch) {
    if (
      edit.store === 'navigationSessions' &&
      !state.changes.get(addressId(edit))?.value
    )
      state.removeSession('navigationSessions', String(edit.key));
  }
}

function enforceResumeBudget(
  state: TransactionState,
  resumes: readonly DataRow[],
  progress: readonly DataRow[],
  onTrimStart: () => void,
  onTrimEnd: () => void,
): void {
  const rows = overlayRows('resumeSessions', resumes, state.changes);
  const effectiveProgress = overlayRows('progress', progress, state.changes);
  const dates = new Map(
    effectiveProgress
      .filter((p) => p.kind === 'resume')
      .map((p) => [p.id, p.updatedAt]),
  );
  rows.sort(
    (a, b) =>
      Number(!!b.pinned) - Number(!!a.pinned) ||
      (dates.get(b.id) ?? b.updatedAt) - (dates.get(a.id) ?? a.updatedAt) ||
      Number(
        state.changes.has(addressId({ store: 'resumeSessions', key: b.id })),
      ) -
        Number(
          state.changes.has(addressId({ store: 'resumeSessions', key: a.id })),
        ),
  );

  const kept = rows.slice(0, SESSION_LIMIT);
  for (const row of rows.slice(SESSION_LIMIT))
    state.removeSession('resumeSessions', row.id);

  const ids = new Set(kept.map((row) => row.id));
  for (const edit of state.batch) {
    if (
      edit.store === 'resumeSessions' &&
      !state.changes.get(addressId(edit))?.value
    )
      state.removeSession('resumeSessions', String(edit.key));
    if (
      edit.store === 'lists' &&
      edit.value?.kind === 'resume' &&
      !ids.has(edit.value.id)
    )
      state.stage(edit, undefined);
  }
  for (const row of effectiveProgress) {
    if (row.kind === 'resume' && !ids.has(row.id))
      state.stage({ store: 'progress', key: ['resume', row.id] }, undefined);
  }

  let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
  kept.forEach((row, index) => {
    const limit = sessionArticleLimit(remaining, kept.length - index - 1);
    const count = Math.max(1, Math.min(row.articleCount || 1, limit));
    remaining -= count;
    if (row.articleCount <= count) return;
    const address: RecordAddress = { store: 'lists', key: ['resume', row.id] };
    const trim = (list: DataRow | undefined) => {
      const version = nextListVersion();
      const paths = articleWindow(
        Array.isArray(list?.paths) ? list.paths : [],
        row.path,
        count,
      );
      state.stage(address, { kind: 'resume', id: row.id, paths, version });
      state.stage(
        { store: 'resumeSessions', key: row.id },
        { ...row, articleCount: paths.length, listVersion: version },
      );
    };
    const staged = state.changes.get(addressId(address));
    if (staged?.value) {
      trim(staged.value);
    } else {
      onTrimStart();
      const request = state.tx.objectStore('lists').get(address.key);
      request.onsuccess = () => {
        try {
          trim(request.result);
          onTrimEnd();
        } catch (error) {
          state.abort(error);
        }
      };
    }
  });

  // Reject a stale list update when its parent was deleted in another tab.
  for (const edit of state.batch) {
    if (edit.store === 'lists' && edit.value?.kind === 'resume') {
      const parent: RecordAddress = {
        store: 'resumeSessions',
        key: edit.value.id,
      };
      if (
        state.changes.has(addressId(parent)) &&
        !state.changes.get(addressId(parent))!.value
      )
        state.stage(edit, undefined);
    }
  }
}

function flushStagedChanges(
  tx: IDBTransaction,
  latest: ReadonlyMap<string, CommittedRecord>,
  changes: ReadonlyMap<string, CommittedRecord>,
): void {
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
    } else {
      store.delete(change.key);
    }
  }
}

/** The transaction owns every read needed to validate or merge an operation. */
export function commitRecords(
  database: IDBDatabase,
  batch: readonly RecordEdit[],
  track: (tx: IDBTransaction) => void = () => {},
): Promise<CommittedRecord[]> {
  const { scopes, resumeBudget, navigationBudget, positions } =
    resolveScopes(batch);

  return new Promise((resolve, reject) => {
    const tx = database.transaction(scopes, 'readwrite');
    track(tx);
    const latest = new Map<string, CommittedRecord>();
    const changes = new Map<string, CommittedRecord>();
    let resumes: DataRow[] = [];
    let navigation: DataRow[] = [];
    let progress: DataRow[] = [];
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
    const stage = (address: RecordAddress, value: DataRow | undefined) => {
      changes.set(addressId(address), { ...address, value });
    };
    const removeSession = (store: SessionStore, id: string) => {
      const kind = sessionKind(store);
      stage({ store, key: id }, undefined);
      stage({ store: 'lists', key: [kind, id] }, undefined);
      stage({ store: 'progress', key: [kind, id] }, undefined);
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
    const recordAll = (store: RecordStore, rows: DataRow[]) => {
      for (const row of rows) {
        const address = { store, key: keyOf(store, row) };
        latest.set(addressId(address), { ...address, value: row });
      }
    };

    for (const edit of batch) {
      read(tx.objectStore(edit.store).get(edit.key), (value) =>
        latest.set(addressId(edit), {
          store: edit.store,
          key: edit.key,
          value,
        }),
      );
    }
    for (const edit of positions) {
      const address: RecordAddress = {
        store: 'resumeSessions',
        key: edit.value!.id,
      };
      read(tx.objectStore('resumeSessions').get(address.key), (value) =>
        latest.set(addressId(address), { ...address, value }),
      );
    }
    if (resumeBudget) {
      read(tx.objectStore('resumeSessions').getAll(), (value) => {
        resumes = value;
        recordAll('resumeSessions', value);
      });
    }
    if (navigationBudget) {
      read(tx.objectStore('navigationSessions').getAll(), (value) => {
        navigation = value;
        recordAll('navigationSessions', value);
      });
    }
    if (resumeBudget || navigationBudget) {
      read(tx.objectStore('progress').getAll(), (value) => {
        progress = value;
        recordAll('progress', value);
      });
    }

    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;

      for (const edit of batch) {
        if (edit.store === 'progress') continue;
        stage(edit, mergeRecord(edit, latest.get(addressId(edit))?.value));
      }
      for (const edit of batch) {
        if (edit.store !== 'progress') continue;
        stage(edit, mergeProgressEdit(edit, latest, changes));
      }

      const state: TransactionState = {
        tx,
        batch,
        latest,
        changes,
        stage,
        removeSession,
        abort,
      };
      if (navigationBudget) enforceNavigationBudget(state, navigation);

      let trimming = 0;
      const finish = () => {
        if (!trimming) flushStagedChanges(tx, latest, changes);
      };
      if (resumeBudget) {
        enforceResumeBudget(
          state,
          resumes,
          progress,
          () => {
            trimming++;
          },
          () => {
            trimming--;
            finish();
          },
        );
      }
      finish();
    };

    tx.oncomplete = () => resolve([...changes.values()]);
    tx.onabort = () =>
      reject(failure ?? tx.error ?? new Error('IndexedDB transaction aborted'));
    tx.onerror = () => {};
  });
}
