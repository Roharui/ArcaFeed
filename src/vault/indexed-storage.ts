import { reportFailure, OperationError } from '@/utils/operation-error';
import { mergeStoredValue } from './storage-merge';
import { writeStorageBatch, STORAGE_REVISION_KEY } from './storage-batch';
import type { PendingWrite } from './storage-batch';
import { READING_LIST_PREFIX } from './storage-keys';

const DATABASE = 'ArcaFeed';
const STORE = 'values';
const MIGRATED = '__localStorageMigrated__';
const SITE_KEYS = new Set(['recent_articles', 'recent_disabled']);

/** A synchronous read cache, hydrated before application construction. */
export class IndexedStorage implements Storage {
  private values = new Map<string, string>();
  private pending = new Map<string, PendingWrite>();
  private inventory = new Set<string>();
  private database?: IDBDatabase;
  private opening: Promise<void> | undefined;
  private saving: Promise<void> | undefined;
  private scheduled = false;
  private revision = 0;
  private channel?: BroadcastChannel;
  private refreshing: Promise<void> | undefined;
  private refreshAll = false;
  private refreshKeys = new Set<string>();
  private checking: Promise<void> | undefined;
  private syncedRevision: string | null = null;
  private requestedKeys = new Set<string>();

  constructor(
    private factory: IDBFactory,
    private legacy: Storage,
    private notify: (key: string) => void = () => {},
    private hydrate: (key: string) => boolean = () => true,
    private notifyBatch?: (keys: readonly string[]) => void,
  ) {}

  initialize(): Promise<void> {
    return (this.opening ??= this.open().catch((error) => {
      this.database?.close();
      this.opening = undefined;
      throw error;
    }));
  }

  private async open(): Promise<void> {
    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error('IndexedDB upgrade is blocked'));
      request.onsuccess = () => resolve(request.result);
    });
    this.database.onversionchange = () => this.database?.close();
    await this.migrate();
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('arcaFeed:storage');
      this.channel.onmessage = (event) => {
        const keys = event?.data?.keys;
        void this.refresh(
          Array.isArray(keys) && keys.every((key) => typeof key === 'string')
            ? keys
            : undefined,
        ).catch((error) => this.report(error));
      };
    }
    await this.refresh();
  }

  private async migrate(): Promise<void> {
    const imported = new Map<string, string>();
    for (let index = 0; index < this.legacy.length; index++) {
      const key = this.legacy.key(index);
      if (!key || !(key.startsWith('arcaFeed:') || key === 'arca_version_info'))
        continue;
      const value = this.legacy.getItem(key);
      if (value !== null) imported.set(key, value);
    }
    const migrated = await this.readValue(MIGRATED);
    if (migrated !== null) {
      for (const key of imported.keys()) this.legacy.removeItem(key);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = this.database!.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const marker = store.get(MIGRATED);
      marker.onsuccess = () => {
        if (marker.result !== undefined) return;
        for (const [key, value] of imported) {
          const existing = store.get(key);
          existing.onsuccess = () => {
            if (existing.result === undefined) store.put(value, key);
          };
        }
        store.put('1', MIGRATED);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => {};
    });
    // The marker and every imported value commit together. Other site keys remain.
    for (const key of imported.keys()) this.legacy.removeItem(key);
  }

  private readValue(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.database!.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(key);
      transaction.oncomplete = () => resolve(request.result ?? null);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => {};
    });
  }

  /** Missed broadcasts are recovered without scanning an unchanged database. */
  refreshIfChanged(): Promise<void> {
    return (this.checking ??= Promise.resolve().then(async () => {
      try {
        const revision = await this.readValue(STORAGE_REVISION_KEY);
        if (revision === null || revision !== this.syncedRevision)
          await this.refresh();
      } finally {
        this.checking = undefined;
      }
    }));
  }

  refresh(keys?: readonly string[]): Promise<void> {
    if (keys)
      for (const key of [...keys, STORAGE_REVISION_KEY])
        this.refreshKeys.add(key);
    else this.refreshAll = true;
    return (this.refreshing ??= Promise.resolve().then(async () => {
      try {
        while (this.refreshAll || this.refreshKeys.size) {
          const selected = this.refreshAll ? undefined : [...this.refreshKeys];
          this.refreshAll = false;
          this.refreshKeys.clear();
          await this.readSnapshot(selected);
        }
      } finally {
        this.refreshing = undefined;
      }
    }));
  }

  /** Hydrate large payloads only before the operation that consumes them. */
  prepareKeys(keys: readonly string[]): Promise<void> | undefined {
    const missing = keys.filter(
      (key) => this.inventory.has(key) && !this.values.has(key),
    );
    if (!missing.length) return;
    for (const key of missing) this.requestedKeys.add(key);
    return this.refresh(missing);
  }

  private shouldRead(key: string): boolean {
    return (
      this.hydrate(key) || this.requestedKeys.has(key) || this.values.has(key)
    );
  }

  private async readSnapshot(keys?: readonly string[]): Promise<void> {
    const revision = this.revision;
    let inventory: Set<string> | undefined;
    const presence = new Map<string, boolean>();
    const snapshot = await new Promise<Map<string, string>>(
      (resolve, reject) => {
        const transaction = this.database!.transaction(STORE, 'readonly');
        const values = new Map<string, string>();
        const store = transaction.objectStore(STORE);
        const read = (selected: readonly string[]) => {
          for (const key of selected) {
            if (!this.shouldRead(key)) {
              if (keys) {
                const request = store.getKey(key);
                request.onsuccess = () =>
                  presence.set(key, request.result !== undefined);
              }
              continue;
            }
            const request = store.get(key);
            request.onsuccess = () => {
              if (request.result !== undefined) values.set(key, request.result);
            };
          }
        };
        if (keys) read(keys);
        else {
          const request = store.getAllKeys();
          request.onsuccess = () => {
            inventory = new Set(request.result.map(String));
            read([...inventory]);
          };
        }
        transaction.oncomplete = () => resolve(values);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => {};
      },
    );
    if (revision !== this.revision) {
      if (keys) for (const key of keys) this.refreshKeys.add(key);
      else this.refreshAll = true;
      return;
    }
    if (!keys) this.syncedRevision = snapshot.get(STORAGE_REVISION_KEY) ?? null;
    const notifications: string[] = [];
    const changed = keys ?? new Set([...this.inventory, ...snapshot.keys()]);
    if (inventory) {
      this.inventory = inventory;
      for (const [key, edit] of this.pending) {
        if (edit.value === null) this.inventory.delete(key);
        else this.inventory.add(key);
      }
    }
    for (const key of changed) {
      if (this.pending.has(key)) continue;
      if (!this.shouldRead(key)) {
        if (presence.get(key) === true) this.inventory.add(key);
        else if (presence.get(key) === false) this.inventory.delete(key);
        continue;
      }
      const value = snapshot.get(key);
      if (value === undefined) this.inventory.delete(key);
      else this.inventory.add(key);
      if (this.values.get(key) === value) continue;
      if (value === undefined) this.values.delete(key);
      else this.values.set(key, value);
      notifications.push(key);
    }
    this.notifyChanges(notifications);
  }

  private notifyChanges(keys: readonly string[]): void {
    const changed = keys.filter(
      (key) => key !== STORAGE_REVISION_KEY && key !== MIGRATED,
    );
    if (!changed.length) return;
    if (this.notifyBatch) this.notifyBatch(changed);
    else for (const key of changed) this.notify(key);
  }

  get length(): number {
    return this.inventory.size;
  }

  key(index: number): string | null {
    return [...this.inventory][index] ?? null;
  }

  keys(): string[] {
    return [...this.inventory];
  }

  getItem(key: string): string | null {
    // These records belong to arca.live. Observe its updates without writing to it.
    if (SITE_KEYS.has(key)) return this.legacy.getItem(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.values.get(key) === value) return;
    const pending = this.pending.get(key);
    const base = pending ? pending.base : this.getItem(key);
    this.revision++;
    this.values.set(key, value);
    this.inventory.add(key);
    this.pending.set(key, { base, value });
    this.schedule();
  }

  removeItem(key: string): void {
    if (!this.inventory.has(key)) return;
    const pending = this.pending.get(key);
    const base = pending ? pending.base : this.getItem(key);
    this.revision++;
    this.values.delete(key);
    this.inventory.delete(key);
    this.pending.set(key, { base, value: null });
    this.schedule();
  }

  clear(): void {
    for (const key of this.inventory) this.removeItem(key);
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    void Promise.resolve()
      .then(() => {
        this.scheduled = false;
        return this.flush();
      })
      .catch((error) => this.report(error));
  }

  /** Resolves only after every queued write has committed; failures remain retryable. */
  flush(): Promise<void> {
    return (this.saving ??= Promise.resolve().then(async () => {
      try {
        while (this.pending.size) await this.commit();
      } finally {
        this.saving = undefined;
      }
    }));
  }

  private commit(): Promise<void> {
    const batch = new Map(this.pending);
    return new Promise<void>((resolve, reject) => {
      const transaction = this.database!.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const committed = writeStorageBatch(store, batch);
      transaction.oncomplete = () => {
        const committedRevision = committed.get(STORAGE_REVISION_KEY);
        if (Number(committedRevision) === Number(this.syncedRevision ?? 0) + 1)
          this.syncedRevision = committedRevision ?? null;
        const notifications: string[] = [];
        for (const [key, value] of committed) {
          const edit = batch.get(key);
          const pending = this.pending.get(key);
          if (pending === edit) {
            this.pending.delete(key);
            if (this.getItem(key) !== value) notifications.push(key);
            if (value === null) this.values.delete(key);
            else this.values.set(key, value);
          } else if (pending && edit) {
            pending.value = mergeStoredValue(
              key,
              edit.value,
              pending.value,
              value,
            );
            pending.base = value;
            if (pending.value === null) this.values.delete(key);
            else this.values.set(key, pending.value);
          }
          if (this.values.has(key)) this.inventory.add(key);
          else this.inventory.delete(key);
        }
        this.channel?.postMessage({ keys: [...committed.keys()] });
        this.notifyChanges(notifications);
        resolve();
      };
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => {};
    });
  }

  private report(error: unknown): void {
    reportFailure(
      new OperationError(
        'storage',
        'IndexedDB 저장에 실패했습니다. 다시 시도해주세요.',
        error,
      ),
    );
  }
}

let storage: IndexedStorage | undefined;
let observing = false;

export async function initializeStorage(): Promise<void> {
  const articleKey = new URL(window.location.href).searchParams.get(
    'articleKey',
  );
  storage ??= new IndexedStorage(
    indexedDB,
    localStorage,
    (key) => {
      window.dispatchEvent(
        new CustomEvent('arcafeed:storage', { detail: { key } }),
      );
    },
    (key) =>
      !key.startsWith(READING_LIST_PREFIX) &&
      (!key.endsWith(':articleList') ||
        key === `arcaFeed:${articleKey}:articleList`),
    (keys) =>
      window.dispatchEvent(
        new CustomEvent('arcafeed:storage', { detail: { keys } }),
      ),
  );
  await storage.initialize();
  if (!observing) {
    observing = true;
    const refresh = () => {
      void storage!.refreshIfChanged().catch((error) => reportFailure(error));
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
  }
}

export function getStorage(): Storage {
  if (!storage) throw new Error('IndexedDB has not been initialized');
  return storage;
}

export function flushStorage(): Promise<void> {
  return storage?.flush() ?? Promise.resolve();
}
