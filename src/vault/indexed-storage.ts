import { OperationError, reportFailure } from '@/utils/operation-error';
import {
  RECORD_STORES,
  addressId,
  equalData,
  keyOf,
  mergeRecord,
} from './record-schema';
import type {
  DataRow,
  RecordAddress,
  RecordCache,
  RecordEdit,
  RecordKey,
  RecordStore,
} from './record-schema';
import { importLegacyRecords } from './record-migration';
import { commitRecords } from './record-transaction';
import { StorageActivity } from './storage-activity';
const SMALL = RECORD_STORES.filter((name) => name !== 'lists');
export class IndexedStorage implements RecordCache {
  private activity = new StorageActivity();
  private database?: IDBDatabase;
  private opening: Promise<void> | undefined;
  private saving: Promise<void> | undefined;
  private refreshing: Promise<void> | undefined;
  private pending = new Map<string, RecordEdit>();
  private cache = new Map<string, { address: RecordAddress; value: DataRow }>();
  private arrays = new Map<RecordStore, readonly DataRow[]>();
  private loadedLists = new Map<string, RecordAddress>();
  private readyLists = new Set<string>();
  private requested = new Map<string, RecordAddress>();
  private refreshAll = false;
  private revision = 0;
  private channel?: BroadcastChannel;
  private unavailable = false;
  constructor(
    private factory: IDBFactory,
    private legacy: Storage,
    private notify: (changes: readonly RecordAddress[]) => void = () => {},
    private currentId = '',
    private origin = 'https://arca.live',
  ) {}
  initialize(): Promise<void> {
    return (this.opening ??= this.open().catch((error) => {
      this.opening = undefined;
      this.database?.close();
      throw error;
    }));
  }
  private async open(): Promise<void> {
    await this.activity.ready();
    const cleanup: string[] = [];
    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open('ArcaFeed', 2);
      let failure: unknown;
      let blocked = false;
      request.onupgradeneeded = () => {
        const db = request.result,
          tx = request.transaction!;
        for (const name of RECORD_STORES)
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, {
              keyPath:
                name === 'lists' || name === 'progress' ? ['kind', 'id'] : 'id',
            });
            if (name === 'resumeSessions')
              store.createIndex('context', 'contextKey', { unique: true });
          }
        const values = new Map<string, string>();
        for (let index = 0; index < this.legacy.length; index++) {
          const key = this.legacy.key(index);
          if (
            key &&
            (key.startsWith('arcaFeed:') || key === 'arca_version_info')
          ) {
            const value = this.legacy.getItem(key);
            if (value !== null) values.set(key, value);
            cleanup.push(key);
          }
        }
        const convert = () => {
          try {
            for (const row of importLegacyRecords(
              values,
              this.origin,
              this.currentId,
            ))
              tx.objectStore(row.store).put(row.value);
            tx.objectStore('meta').put({ id: 'schema', version: 2 });
            // Clear the old string records only in the transaction that imports them.
            if (db.objectStoreNames.contains('values'))
              db.deleteObjectStore('values');
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
        if (db.objectStoreNames.contains('values')) {
          const old = tx.objectStore('values');
          const marker = old.get('__localStorageMigrated__');
          marker.onsuccess = () => {
            if (marker.result !== undefined) values.clear();
            const cursor = old.openCursor();
            cursor.onsuccess = () => {
              const entry = cursor.result;
              if (entry) {
                if (typeof entry.value === 'string')
                  values.set(String(entry.key), entry.value);
                entry.continue();
              } else convert();
            };
          };
        } else convert();
      };
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(failure ?? request.error);
      request.onblocked = () => {
        blocked = true;
        reject(
          new Error('데이터 이전을 위해 다른 ArcaFeed 탭을 새로고침해주세요.'),
        );
      };
    });
    if (
      !RECORD_STORES.every((name) =>
        this.database!.objectStoreNames.contains(name),
      )
    )
      throw new Error('지원하지 않는 저장소 구조입니다.');
    if (!cleanup.length)
      for (let index = 0; index < this.legacy.length; index++) {
        const key = this.legacy.key(index);
        if (key && (key.startsWith('arcaFeed:') || key === 'arca_version_info'))
          cleanup.push(key);
      }
    for (const key of cleanup) this.legacy.removeItem(key);
    this.database.onversionchange = () => {
      this.unavailable = true;
      this.database?.close();
    };
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('arcaFeed:records');
      this.channel.onmessage = (event) => {
        const changes = event?.data?.changes;
        void this.refresh(Array.isArray(changes) ? changes : undefined).catch(
          (error) => this.report(error),
        );
      };
    }
    await this.refresh();
  }
  get<T = DataRow>(store: RecordStore, key: RecordKey): T | undefined {
    return this.cache.get(addressId({ store, key }))?.value as T | undefined;
  }
  all<T = DataRow>(store: RecordStore): readonly T[] {
    if (!this.arrays.has(store))
      this.arrays.set(
        store,
        [...this.cache.values()]
          .filter((entry) => entry.address.store === store)
          .map((entry) => entry.value),
      );
    return this.arrays.get(store)! as readonly T[];
  }
  private apply(address: RecordAddress, value: DataRow | undefined): boolean {
    const id = addressId(address),
      old = this.cache.get(id)?.value;
    if (address.store === 'lists' && !value) {
      const [kind, sessionId] = address.key as [string, string];
      if (
        !this.get(
          kind === 'resume' ? 'resumeSessions' : 'navigationSessions',
          sessionId,
        )
      ) {
        this.loadedLists.delete(id);
        this.readyLists.delete(id);
      }
    }
    if (equalData(old, value)) return false;
    if (value) this.cache.set(id, { address, value });
    else this.cache.delete(id);
    this.arrays.delete(address.store);
    return true;
  }
  set(
    store: RecordStore,
    key: RecordKey,
    value: DataRow,
    automatic = false,
  ): void {
    const address = { store, key },
      id = addressId(address),
      old = this.get(store, key);
    if (old?.revision !== undefined)
      value = { ...value, revision: old.revision };
    if (equalData(old, value)) return;
    const pending = this.pending.get(id);
    this.pending.set(id, {
      ...address,
      base: pending ? pending.base : old,
      value,
      automatic,
    });
    this.apply(address, value);
    if (store === 'lists') {
      this.loadedLists.set(id, address);
      this.readyLists.add(id);
    }
    this.revision++;
    this.schedule();
  }
  delete(store: RecordStore, key: RecordKey, automatic = false): void {
    const address = { store, key },
      id = addressId(address),
      pending = this.pending.get(id),
      old = this.get(store, key);
    this.pending.set(id, {
      ...address,
      base: pending ? pending.base : old,
      value: undefined,
      automatic,
    });
    this.apply(address, undefined);
    this.revision++;
    this.schedule();
  }
  site(key: string): string | null {
    return this.legacy.getItem(key);
  }
  prepare(addresses: readonly RecordAddress[]): Promise<void> | undefined {
    const missing = addresses.filter((address) => {
      if (address.store !== 'lists' || this.readyLists.has(addressId(address)))
        return false;
      const [kind, id] = address.key as [string, string];
      return !!this.get(
        kind === 'resume' ? 'resumeSessions' : 'navigationSessions',
        id,
      );
    });
    if (!missing.length) return;
    for (const address of missing)
      this.loadedLists.set(addressId(address), address);
    return this.refresh([
      ...missing,
      ...missing.map((address): RecordAddress => {
        const [kind, id] = address.key as [string, string];
        return {
          store: kind === 'resume' ? 'resumeSessions' : 'navigationSessions',
          key: id,
        };
      }),
    ]);
  }
  refresh(addresses?: readonly RecordAddress[]): Promise<void> {
    if (addresses) {
      for (const address of addresses)
        if (RECORD_STORES.includes(address.store))
          this.requested.set(addressId(address), address);
    } else this.refreshAll = true;
    return (this.refreshing ??= Promise.resolve().then(async () => {
      try {
        while (this.refreshAll || this.requested.size) {
          const selected = this.refreshAll
            ? undefined
            : [...this.requested.values()];
          this.refreshAll = false;
          this.requested.clear();
          await this.snapshot(selected);
        }
      } finally {
        this.refreshing = undefined;
      }
    }));
  }
  private async snapshot(selected?: readonly RecordAddress[]): Promise<void> {
    const revision = this.revision;
    const entries = new Map<
      string,
      { address: RecordAddress; value: DataRow | undefined }
    >();
    const full = !selected;
    await this.activity.run(
      (track) =>
        new Promise<void>((resolve, reject) => {
          entries.clear();
          let count = 0;
          const wanted = new Set((selected ?? []).map(addressId));
          const requestedLists = new Map(
            [...this.loadedLists].filter(([, address]) => {
              if (full || wanted.has(addressId(address))) return true;
              const [kind, id] = address.key as [string, string];
              return wanted.has(
                addressId({
                  store:
                    kind === 'resume' ? 'resumeSessions' : 'navigationSessions',
                  key: id,
                }),
              );
            }),
          );
          if (
            this.currentId &&
            (full ||
              wanted.has(
                addressId({ store: 'navigationSessions', key: this.currentId }),
              ))
          ) {
            const address: RecordAddress = {
              store: 'lists',
              key: ['navigation', this.currentId],
            };
            requestedLists.set(addressId(address), address);
            this.loadedLists.set(addressId(address), address);
          }
          const scope = new Set<RecordStore>(
            full ? SMALL : selected!.map((address) => address.store),
          );
          if (requestedLists.size) scope.add('lists');
          if (!scope.size) {
            resolve();
            return;
          }
          const tx = this.database!.transaction([...scope], 'readonly');
          track(tx);
          const readLists = () => {
            for (const [id, address] of requestedLists) {
              const [kind, sessionId] = address.key as [string, string];
              const parent: RecordAddress = {
                store:
                  kind === 'resume' ? 'resumeSessions' : 'navigationSessions',
                key: sessionId,
              };
              const metadata = entries.has(addressId(parent))
                ? entries.get(addressId(parent))!.value
                : this.get(parent.store, parent.key);
              if (
                metadata?.listVersion ===
                  this.get('lists', address.key)?.version &&
                !selected?.some((item) => addressId(item) === id)
              )
                continue;
              const request = tx.objectStore('lists').get(address.key);
              request.onsuccess = () =>
                entries.set(id, { address, value: request.result });
            }
          };
          if (full) {
            for (const store of SMALL) {
              count++;
              const request = tx.objectStore(store).getAll();
              request.onsuccess = () => {
                for (const row of request.result) {
                  const address = { store, key: keyOf(store, row) };
                  entries.set(addressId(address), { address, value: row });
                }
                for (const entry of this.cache.values())
                  if (
                    entry.address.store === store &&
                    !entries.has(addressId(entry.address))
                  )
                    entries.set(addressId(entry.address), {
                      address: entry.address,
                      value: undefined,
                    });
                if (--count === 0) readLists();
              };
            }
          } else {
            const small = selected.filter(
              (address) => address.store !== 'lists',
            );
            for (const address of selected)
              if (
                address.store === 'lists' &&
                this.loadedLists.has(addressId(address))
              )
                requestedLists.set(addressId(address), address);
            count = small.length;
            for (const address of small) {
              const request = tx.objectStore(address.store).get(address.key);
              request.onsuccess = () => {
                entries.set(addressId(address), {
                  address,
                  value: request.result,
                });
                if (--count === 0) readLists();
              };
            }
            if (!count) readLists();
          }
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
          tx.onerror = () => {};
        }),
    );
    if (revision !== this.revision) {
      if (selected)
        for (const address of selected)
          this.requested.set(addressId(address), address);
      else this.refreshAll = true;
      return;
    }
    const changes: RecordAddress[] = [];
    for (const [id, { address, value }] of entries) {
      if (address.store === 'lists') this.readyLists.add(id);
      if (!this.pending.has(id) && this.apply(address, value))
        changes.push(address);
    }
    if (changes.length) this.notify(changes);
  }
  private scheduled = false;
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
  flush(): Promise<void> {
    return (this.saving ??= Promise.resolve().then(async () => {
      try {
        if (this.unavailable)
          throw new Error(
            '저장소 버전이 변경되었습니다. 페이지를 새로고침해주세요.',
          );
        while (this.pending.size) {
          const batch = new Map(this.pending);
          const committed = await this.activity.run((track) =>
            commitRecords(this.database!, [...batch.values()], track),
          );
          const notifications: RecordAddress[] = [];
          for (const change of committed) {
            const id = addressId(change),
              edit = batch.get(id),
              pending = this.pending.get(id);
            if (pending === edit) {
              this.pending.delete(id);
              if (this.apply(change, change.value)) notifications.push(change);
            } else if (pending && edit) {
              const value = mergeRecord(
                { ...pending, base: edit.value },
                change.value,
              );
              this.pending.set(id, { ...pending, base: change.value, value });
              this.apply(change, value);
            }
          }
          this.channel?.postMessage({
            changes: committed.map(({ store, key }) => ({ store, key })),
          });
          if (notifications.length) this.notify(notifications);
        }
      } finally {
        this.saving = undefined;
      }
    }));
  }
  private report(error: unknown): void {
    reportFailure(
      new OperationError(
        'storage',
        '저장하지 못했습니다. 다시 시도해주세요.',
        error,
      ),
    );
  }
}
let storage: IndexedStorage | undefined;
let observing = false;
export async function initializeStorage(): Promise<void> {
  storage ??= new IndexedStorage(
    indexedDB,
    localStorage,
    (changes) =>
      window.dispatchEvent(
        new CustomEvent('arcafeed:storage', { detail: { changes } }),
      ),
    new URL(window.location.href).searchParams.get('articleKey') ?? '',
    window.location.origin,
  );
  await storage.initialize();
  if (!observing) {
    observing = true;
    const refresh = () => void storage!.refresh().catch(reportFailure);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
  }
}
export function getStorage(): RecordCache {
  if (!storage) throw new Error('IndexedDB has not been initialized');
  return storage;
}
export function flushStorage(): Promise<void> {
  return storage?.flush() ?? Promise.resolve();
}
