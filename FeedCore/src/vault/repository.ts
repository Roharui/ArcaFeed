import { equalData, nextListVersion, sessionStore } from './record-schema';
import type { DataRow, RecordCache, SessionKind } from './record-schema';
import { ARTICLE_KEY_CACHE_LIMIT } from './storage-keys';

/** Domain records over the hydrated cache; no string-store or JSON facade. */
export class StorageRepository {
  constructor(private storage: RecordCache) {}

  readSetting<T = unknown>(id: string): T | undefined {
    return this.storage.get<DataRow>('settings', id)?.value as T | undefined;
  }

  saveSetting(id: string, value: unknown): void {
    this.storage.set('settings', id, { id, value });
  }

  filterIds(): string[] {
    return this.storage.all('channelFilters').map((row) => row.id);
  }

  readFilter(id: string): unknown {
    return this.storage.get('channelFilters', id)?.value;
  }

  saveFilter(id: string, value: unknown): void {
    this.storage.set('channelFilters', id, { id, value });
  }

  deleteFilter(id: string): void {
    this.storage.delete('channelFilters', id);
  }

  readNavigation(id: string): DataRow | undefined {
    return this.storage.get('navigationSessions', id);
  }

  saveNavigation(id: string, value: DataRow): void {
    this.storage.set('navigationSessions', id, { ...value, id });
  }

  navigationPosition(id: string): DataRow | undefined {
    return this.storage.get('progress', ['navigation', id]);
  }

  saveNavigationPosition(id: string, activeIndex: number): void {
    this.storage.set('progress', ['navigation', id], {
      kind: 'navigation',
      id,
      activeIndex,
      updatedAt: Date.now(),
    });
  }

  pruneArticleKeyCaches(currentId: string): void {
    if (!currentId) return;
    let rows = this.storage.all('navigationSessions');
    let current: DataRow | undefined;
    let newest: DataRow | undefined;
    for (const row of rows) {
      if (row.id === currentId) current = row;
      if (!newest || row.lastUsedAt > newest.lastUsedAt) newest = row;
    }
    if (current && newest && newest.id !== currentId) {
      this.storage.set('navigationSessions', currentId, {
        ...current,
        lastUsedAt: Math.max(Date.now(), newest.lastUsedAt + 1),
      });
      rows = this.storage.all('navigationSessions');
    }
    // Reserve a slot for the current ID even before it has a stored row.
    if (rows.length + Number(!current) <= ARTICLE_KEY_CACHE_LIMIT) return;
    const ordered = [
      currentId,
      ...rows
        .filter((row) => row.id !== currentId)
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .map((row) => row.id),
    ].slice(0, ARTICLE_KEY_CACHE_LIMIT);
    const kept = new Set(ordered);
    for (const row of rows)
      if (!kept.has(row.id)) this.deleteSession('navigation', row.id);
  }

  readList(kind: string, id: string): unknown {
    return this.storage.get('lists', [kind, id])?.paths;
  }

  listVersion(kind: string, id: string): string | undefined {
    return this.storage.get('lists', [kind, id])?.version;
  }

  deleteResumePosition(id: string): void {
    this.storage.delete('progress', ['resume', id]);
  }

  saveList(kind: string, id: string, paths: readonly string[]): string {
    const previous = this.storage.get('lists', [kind, id]);
    if (previous && equalData(previous.paths, paths)) return previous.version;
    const version = nextListVersion();
    this.storage.set('lists', [kind, id], {
      kind,
      id,
      paths: [...paths],
      version,
    });
    return version;
  }

  prepareLists(ids: readonly string[]): Promise<void> | undefined {
    return this.storage.prepare(
      ids.map((id) => ({ store: 'lists', key: ['resume', id] })),
    );
  }

  resumes(): readonly DataRow[] {
    return this.storage.all('resumeSessions');
  }

  saveResume(value: DataRow, automatic = false): void {
    this.storage.set('resumeSessions', value.id, value, automatic);
  }

  private progressSource: readonly DataRow[] | undefined;
  private positions: readonly DataRow[] = [];

  resumeProgress(): readonly DataRow[] {
    const source = this.storage.all('progress');
    if (source !== this.progressSource) {
      this.progressSource = source;
      this.positions = source
        .filter((row) => row.kind === 'resume')
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt || (b.sequence ?? 0) - (a.sequence ?? 0),
        );
    }
    return this.positions;
  }

  savePosition(value: DataRow): void {
    const previous = this.storage.get('progress', ['resume', value.id]);
    if (
      previous &&
      previous.path === value.path &&
      previous.scrollY === value.scrollY &&
      previous.updatedAt === value.updatedAt
    )
      return;
    let maxSequence = 0;
    for (const row of this.storage.all('progress')) {
      maxSequence = Math.max(maxSequence, row.sequence ?? 0);
    }
    this.storage.set('progress', ['resume', value.id], {
      ...value,
      kind: 'resume',
      sequence: maxSequence + 1,
    });
  }

  deleteSession(kind: SessionKind, id: string, automatic = false): void {
    this.storage.delete(sessionStore(kind), id, automatic);
  }

  site(key: string): string | null {
    return this.storage.site(key);
  }
}
