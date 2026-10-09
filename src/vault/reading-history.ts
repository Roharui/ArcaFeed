import { StorageRepository } from './repository';
import { normalizeArticles, stringList } from './config-schema';

export interface ReadingEntry {
  path: string;
  title: string;
  channelName: string;
  visitedAt: number;
}

export interface ReadingSession {
  id: string;
  label: string;
  path: string;
  searchQuery: string;
  articleList: string[];
  isSeriesMode: boolean;
  isScrapMode: boolean;
  seriesChannels: string[];
  scrollY: number;
  updatedAt: number;
}

interface ReadingData {
  entries: ReadingEntry[];
  sessions: ReadingSession[];
}

export const READING_HISTORY_KEY = 'arcaFeed:readingHistory';
export const HISTORY_LIMIT = 1000;
export const SESSION_LIMIT = 20;
const SESSION_ARTICLE_LIMIT = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function timestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, 300) : fallback;
}

/** Global history survives the small, independently pruned navigation cache. */
export class ReadingHistory {
  private data: ReadingData;
  private visitedPaths = new Set<string>();
  private listeners = new Set<() => void>();

  constructor(private repo = new StorageRepository()) {
    this.data = this.load();
    this.updateVisitedPaths();
  }

  get entries(): readonly ReadingEntry[] {
    return this.data.entries;
  }

  get sessions(): readonly ReadingSession[] {
    return this.data.sessions;
  }

  hasVisited(path: string): boolean {
    return this.visitedPaths.has(path);
  }

  getVisitedPaths(): Set<string> {
    return new Set(this.visitedPaths);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reload(): void {
    this.data = this.load();
    this.notify();
  }

  visit(entry: Omit<ReadingEntry, 'visitedAt'>): void {
    this.change((data) => {
      data.entries = [
        { ...entry, visitedAt: Date.now() },
        ...data.entries.filter((item) => item.path !== entry.path),
      ].slice(0, HISTORY_LIMIT);
    });
  }

  saveSession(session: ReadingSession): void {
    this.change((data) => {
      data.sessions = [
        session,
        ...data.sessions.filter((item) => item.id !== session.id),
      ].slice(0, SESSION_LIMIT);
    });
  }

  removeSession(id: string): void {
    this.change((data) => {
      data.sessions = data.sessions.filter((item) => item.id !== id);
    });
  }

  clear(): void {
    this.change((data) => {
      data.entries = [];
      data.sessions = [];
    });
  }

  /** Merge each operation with disk so an older tab does not overwrite newer visits. */
  private change(mutate: (data: ReadingData) => void): void {
    const next = this.load();
    mutate(next);
    this.repo.setJSON(READING_HISTORY_KEY, next);
    this.data = next;
    this.notify();
  }

  private notify(): void {
    this.updateVisitedPaths();
    this.listeners.forEach((listener) => listener());
  }

  private updateVisitedPaths(): void {
    this.visitedPaths = new Set(this.data.entries.map((entry) => entry.path));
  }

  private load(): ReadingData {
    const raw = this.repo.getJSON<unknown>(READING_HISTORY_KEY);
    if (!isRecord(raw)) return { entries: [], sessions: [] };
    const origin = window.location.origin;
    const entries: ReadingEntry[] = [];
    const seenPaths = new Set<string>();
    for (const item of Array.isArray(raw.entries) ? raw.entries : []) {
      if (!isRecord(item)) continue;
      const path = normalizeArticles([item.path], origin)[0];
      if (!path || seenPaths.has(path) || !timestamp(item.visitedAt)) continue;
      seenPaths.add(path);
      entries.push({
        path,
        title: text(item.title, path),
        channelName: text(item.channelName),
        visitedAt: timestamp(item.visitedAt),
      });
      if (entries.length === HISTORY_LIMIT) break;
    }
    const sessions: ReadingSession[] = [];
    const seenIds = new Set<string>();
    for (const item of Array.isArray(raw.sessions) ? raw.sessions : []) {
      if (!isRecord(item)) continue;
      const path = normalizeArticles([item.path], origin)[0];
      const id = text(item.id);
      if (!path || !id || seenIds.has(id) || !timestamp(item.updatedAt))
        continue;
      seenIds.add(id);
      const params = new URLSearchParams(
        typeof item.searchQuery === 'string'
          ? item.searchQuery.slice(0, 4000)
          : '',
      );
      params.delete('articleKey');
      sessions.push({
        id,
        label: text(item.label, path),
        path,
        searchQuery: params.size ? `?${params}` : '',
        articleList: normalizeArticles(item.articleList, origin).slice(
          0,
          SESSION_ARTICLE_LIMIT,
        ),
        isSeriesMode: item.isSeriesMode === true,
        isScrapMode: item.isScrapMode === true,
        seriesChannels: stringList(item.seriesChannels).filter((channel) =>
          /^[a-zA-Z0-9]+$/.test(channel),
        ),
        scrollY:
          typeof item.scrollY === 'number' && Number.isFinite(item.scrollY)
            ? Math.max(0, item.scrollY)
            : 0,
        updatedAt: timestamp(item.updatedAt),
      });
      if (sessions.length === SESSION_LIMIT) break;
    }
    return { entries, sessions };
  }
}
