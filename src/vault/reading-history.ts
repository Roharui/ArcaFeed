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
  sessions: ReadingSession[];
}

export const READING_HISTORY_KEY = 'arcaFeed:readingHistory';
export const SITE_RECENT_KEY = 'recent_articles';
export const SITE_RECENT_DISABLED_KEY = 'recent_disabled';
export const SITE_RECENT_URL = '/u/recents';
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

/** Match aliases from /b/my using the site's globally unique article IDs. */
export function isVisitedPath(
  paths: Set<string> | undefined,
  path: string,
): boolean {
  return (
    !!paths && (paths.has(path) || paths.has(`/b/my/${path.split('/').pop()}`))
  );
}

/** Read the site's recent history; persist only ArcaFeed resume positions. */
export class ReadingHistory {
  private data: ReadingData;
  private recentEntries: ReadingEntry[] = [];
  private visitedPaths = new Set<string>();
  private listeners = new Set<() => void>();

  constructor(private repo = new StorageRepository()) {
    this.data = this.load();
    this.loadRecentEntries();
    this.updateVisitedPaths();
    // Discard the obsolete duplicate visit list while retaining resume positions.
    const legacy = this.repo.getJSON<unknown>(READING_HISTORY_KEY);
    if (isRecord(legacy) && 'entries' in legacy)
      this.repo.setJSON(READING_HISTORY_KEY, this.data);
  }

  get entries(): readonly ReadingEntry[] {
    return this.recentEntries;
  }

  get sessions(): readonly ReadingSession[] {
    return this.data.sessions;
  }

  hasVisited(path: string): boolean {
    return isVisitedPath(this.visitedPaths, path);
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
    this.loadRecentEntries();
    this.notify();
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
      data.sessions = [];
    });
  }

  /** Merge each checkpoint operation with disk so tabs preserve each other's positions. */
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
    this.visitedPaths = new Set(
      this.recentEntries.flatMap((entry) => [
        entry.path,
        `/b/my/${entry.path.split('/').pop()}`,
      ]),
    );
  }

  private loadRecentEntries(): void {
    this.recentEntries = [];
    if (this.repo.getItem(SITE_RECENT_DISABLED_KEY)) return;
    const raw = this.repo.getJSON<unknown>(SITE_RECENT_KEY);
    const seenIds = new Set<string>();
    for (const item of Array.isArray(raw) ? raw : []) {
      if (!isRecord(item)) continue;
      const slug = typeof item.slug === 'string' ? item.slug : '';
      const id =
        typeof item.articleId === 'string' || typeof item.articleId === 'number'
          ? String(item.articleId)
          : '';
      const visitedAt =
        typeof item.regdateAt === 'number'
          ? timestamp(item.regdateAt * 1000)
          : 0;
      if (
        !/^[a-zA-Z0-9]+$/.test(slug) ||
        !/^\d+$/.test(id) ||
        !visitedAt ||
        seenIds.has(id)
      )
        continue;
      seenIds.add(id);
      const path = `/b/${slug}/${id}`;
      this.recentEntries.push({
        path,
        title: text(item.title, path),
        channelName: text(item.boardName, slug),
        visitedAt,
      });
    }
    this.recentEntries.sort((a, b) => b.visitedAt - a.visitedAt);
  }

  private load(): ReadingData {
    const raw = this.repo.getJSON<unknown>(READING_HISTORY_KEY);
    if (!isRecord(raw)) return { sessions: [] };
    const origin = window.location.origin;
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
    return { sessions };
  }
}
