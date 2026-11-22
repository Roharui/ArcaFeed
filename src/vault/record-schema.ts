export const RECORD_STORES = [
  'settings',
  'channelFilters',
  'navigationSessions',
  'resumeSessions',
  'progress',
  'lists',
  'meta',
] as const;
export type RecordStore = (typeof RECORD_STORES)[number];
export type RecordKey = string | [string, string];
export type SessionKind = 'resume' | 'navigation';
export type SessionStore = 'resumeSessions' | 'navigationSessions';
export type DataRow = Record<string, any>;

export const CHANNEL_ID_REGEX = /^(?:[a-zA-Z0-9_-]+\/)*board\/\d+$/;

export function isChannelId(value: string): boolean {
  return CHANNEL_ID_REGEX.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const sessionStore = (kind: string): SessionStore =>
  kind === 'resume' ? 'resumeSessions' : 'navigationSessions';

export const sessionKind = (store: SessionStore): SessionKind =>
  store === 'resumeSessions' ? 'resume' : 'navigation';

export const parentSessionAddress = (
  listAddress: RecordAddress,
): RecordAddress => {
  const [kind, id] = listAddress.key as [string, string];
  return { store: sessionStore(kind), key: id };
};
export interface RecordAddress {
  store: RecordStore;
  key: RecordKey;
}
export interface RecordEdit extends RecordAddress {
  base: DataRow | undefined;
  value: DataRow | undefined;
  automatic?: boolean;
}
export interface RecordCache {
  get<T = DataRow>(store: RecordStore, key: RecordKey): T | undefined;
  all<T = DataRow>(store: RecordStore): readonly T[];
  set(
    store: RecordStore,
    key: RecordKey,
    value: DataRow,
    automatic?: boolean,
  ): void;
  delete(store: RecordStore, key: RecordKey, automatic?: boolean): void;
  prepare(addresses: readonly RecordAddress[]): Promise<void> | undefined;
  site(key: string): string | null;
}
export const keyOf = (store: RecordStore, row: DataRow): RecordKey =>
  store === 'lists' || store === 'progress' ? [row.kind, row.id] : row.id;
export const addressId = ({ store, key }: RecordAddress): string =>
  typeof key === 'string'
    ? `${store}\0${key}`
    : `${store}\0${key[0]}\0${key[1]}`;

export function equalData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!equalData(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const x = a as DataRow,
    y = b as DataRow;
  const keys = Object.keys(x);
  return (
    keys.length === Object.keys(y).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(y, key) &&
        equalData(x[key], y[key]),
    )
  );
}
export function mergeRecord(
  edit: RecordEdit,
  latest: DataRow | undefined,
): DataRow | undefined {
  if (!edit.value) {
    if (
      edit.automatic &&
      edit.store === 'resumeSessions' &&
      latest?.pinned &&
      !edit.base?.pinned
    )
      return latest;
    return undefined;
  }
  if (edit.store === 'resumeSessions' && edit.base && !latest) return undefined;
  const next = { ...latest };
  for (const key of new Set([
    ...Object.keys(edit.base ?? {}),
    ...Object.keys(edit.value),
  ])) {
    if (
      key === 'revision' ||
      (edit.automatic && (key === 'customName' || key === 'pinned') && latest)
    )
      continue;
    if (equalData(edit.base?.[key], edit.value[key])) continue;
    if (Object.prototype.hasOwnProperty.call(edit.value, key))
      next[key] = edit.value[key];
    else delete next[key];
  }
  return next;
}
let version = 0;
const writer = Math.random().toString(36).slice(2);
export const nextListVersion = (): string => `${writer}:${++version}`;
