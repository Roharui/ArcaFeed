import {
  IndexedStorage as CoreIndexedStorage,
  createStorageManager,
} from '@feed/core/vault/indexed-storage';
import type { IndexedStorageConfig, RecordAddress } from '@feed/core/vault';
import { OperationError, reportFailure } from '@/utils/operation-error';
import { importLegacyRecords } from './record-migration';

const STORAGE_CONFIG: IndexedStorageConfig = {
  dbName: 'ArcaFeed',
  channelName: 'arcaFeed:records',
  appName: 'ArcaFeed',
  defaultOrigin: 'https://arca.live',
  isLegacyStorageKey: (key: string | null): key is string =>
    !!key && (key.startsWith('arcaFeed:') || key === 'arca_version_info'),
  importLegacyRecords,
  createStorageError: (message, cause) =>
    new OperationError('storage', message, cause),
  reportFailure,
};

export class IndexedStorage extends CoreIndexedStorage {
  constructor(
    factory: IDBFactory,
    legacy: Storage,
    notify: (changes: readonly RecordAddress[]) => void = () => {},
    currentId = '',
    origin = STORAGE_CONFIG.defaultOrigin,
  ) {
    super(factory, legacy, STORAGE_CONFIG, notify, currentId, origin);
  }
}

export const { initializeStorage, getStorage, flushStorage } =
  createStorageManager({
    eventName: 'arcafeed:storage',
    getCurrentArticleKey: () =>
      new URL(window.location.href).searchParams.get('articleKey') ?? '',
    createStorage: (factory, legacy, notify, currentId, origin) =>
      new IndexedStorage(factory, legacy, notify, currentId, origin),
    reportFailure,
  });
