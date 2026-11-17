import { reportFailure, OperationError } from '@/utils/operation-error';

const DATABASE = 'ArcaFeed';
const STORE = 'values';
const MIGRATED = '__localStorageMigrated__';
const SITE_KEYS = new Set(['recent_articles', 'recent_disabled']);

/** A synchronous read cache, hydrated before application construction. */
export class IndexedStorage implements Storage {
  private values = new Map<string, string>();
  private pending = new Map<string, string | null>();
  private database?: IDBDatabase;
  private opening: Promise<void> | undefined;
  private saving: Promise<void> | undefined;
  private scheduled = false;
  private revision = 0;
  private channel?: BroadcastChannel;

  constructor(
    private factory: IDBFactory,
    private legacy: Storage,
    private notify: (key: string) => void = () => {},
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
      this.channel.onmessage = () => {
        void this.refresh().catch((error) => this.report(error));
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

  async refresh(): Promise<void> {
    const revision = this.revision;
    const snapshot = await new Promise<Map<string, string>>(
      (resolve, reject) => {
        const transaction = this.database!.transaction(STORE, 'readonly');
        const values = new Map<string, string>();
        const cursor = transaction.objectStore(STORE).openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          values.set(String(entry.key), entry.value);
          entry.continue();
        };
        transaction.oncomplete = () => resolve(values);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => {};
      },
    );
    if (revision !== this.revision) return this.refresh();
    const notifications: string[] = [];
    const changed = new Set([...this.values.keys(), ...snapshot.keys()]);
    for (const key of changed) {
      if (this.pending.has(key)) continue;
      const value = snapshot.get(key);
      if (this.values.get(key) === value) continue;
      if (value === undefined) this.values.delete(key);
      else this.values.set(key, value);
      notifications.push(key);
    }
    for (const key of notifications) this.notify(key);
  }

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    // These records belong to arca.live. Observe its updates without writing to it.
    if (SITE_KEYS.has(key)) return this.legacy.getItem(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.values.get(key) === value) return;
    this.revision++;
    this.values.set(key, value);
    this.pending.set(key, value);
    this.schedule();
  }

  removeItem(key: string): void {
    if (!this.values.has(key)) return;
    this.revision++;
    this.values.delete(key);
    this.pending.set(key, null);
    this.schedule();
  }

  clear(): void {
    for (const key of this.values.keys()) this.removeItem(key);
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
  async flush(): Promise<void> {
    if (this.saving) await this.saving;
    if (!this.pending.size) return;
    this.saving = this.commit();
    try {
      await this.saving;
    } finally {
      this.saving = undefined;
    }
    if (this.pending.size) await this.flush();
  }

  private commit(): Promise<void> {
    const batch = new Map(this.pending);
    return new Promise<void>((resolve, reject) => {
      const transaction = this.database!.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      for (const [key, value] of batch) {
        if (value === null) store.delete(key);
        else store.put(value, key);
      }
      transaction.oncomplete = () => {
        for (const [key, value] of batch) {
          if (this.pending.get(key) === value) this.pending.delete(key);
        }
        this.channel?.postMessage(true);
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
  storage ??= new IndexedStorage(indexedDB, localStorage, (key) => {
    window.dispatchEvent(
      new CustomEvent('arcafeed:storage', { detail: { key } }),
    );
  });
  await storage.initialize();
  if (!observing) {
    observing = true;
    const refresh = () => {
      void storage!.refresh().catch((error) => reportFailure(error));
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
