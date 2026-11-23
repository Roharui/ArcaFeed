import { StorageRepository as CoreStorageRepository } from '@feed/core/vault/repository';
import type { RecordCache } from '@feed/core/vault/record-schema';
import { getStorage } from './indexed-storage';

export class StorageRepository extends CoreStorageRepository {
  constructor(storage: RecordCache = getStorage()) {
    super(storage);
  }
}
