import assert from 'node:assert/strict';
import test from 'node:test';

import { StorageRepository } from '../src/vault/repository.ts';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  writes = 0;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }
}

test('avoids redundant storage writes and tolerates malformed JSON', () => {
  const storage = new MemoryStorage();
  const repository = new StorageRepository(storage);

  repository.setItem('same', 'value');
  repository.setItem('same', 'value');
  repository.setItem('bad-json', '{');

  assert.equal(storage.writes, 2);
  assert.equal(repository.getJSON('bad-json'), null);
});

test('keeps only the latest five scoped article caches', () => {
  const storage = new MemoryStorage();
  let now = 0;
  const repository = new StorageRepository(storage, () => now);

  for (let index = 1; index <= 6; index += 1) {
    now += 61_000;
    const articleKey = `key-${index}`;
    repository.setItem(repository.scopedKey(articleKey, 'articleList'), '[]');
    repository.pruneArticleKeyCaches(articleKey);
  }

  assert.equal(
    repository.getItem(repository.scopedKey('key-1', 'articleList')),
    null,
  );
  assert.equal(
    repository.getItem(repository.scopedKey('key-6', 'articleList')),
    '[]',
  );
});

test('recovers when the recent cache key is not an array', () => {
  const storage = new MemoryStorage();
  const repository = new StorageRepository(storage);
  repository.setJSON('arcaFeed:recentArticleKeys', { corrupted: true });

  assert.doesNotThrow(() => repository.pruneArticleKeyCaches('current'));
  assert.deepEqual(repository.getJSON('arcaFeed:recentArticleKeys'), [
    'current',
  ]);
});
