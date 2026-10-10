import { StorageRepository } from './repository';
import { normalizeArticles, stringList } from './config-schema';
import { articleWindow } from './article-window';

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
export const READING_PROGRESS_KEY = 'arcaFeed:readingProgress';
export const SITE_RECENT_KEY = 'recent_articles';
export const SITE_RECENT_DISABLED_KEY = 'recent_disabled';
export const SITE_RECENT_URL = '/u/recents';
export const SESSION_LIMIT = 20;
const SESSION_ARTICLE_LIMIT = 2000;
export const SESSION_TOTAL_ARTICLE_LIMIT = 5000;

type ReadingChange = 'entries' | 'sessions' | 'progress';
interface ReadingProgress {
  id: string;
  path: string;
  scrollY: number;
  updatedAt: number;
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return (
    a === b || (a.length === b.length && a.every((value, i) => value === b[i]))
  );
}

function sameContext(a: ReadingSession, b: ReadingSession): boolean {
  return (
    a.id === b.id &&
    a.label === b.label &&
    a.path === b.path &&
    a.searchQuery === b.searchQuery &&
    a.isSeriesMode === b.isSeriesMode &&
    a.isScrapMode === b.isScrapMode &&
    sameList(a.seriesChannels, b.seriesChannels) &&
    sameList(a.articleList, b.articleList)
  );
}

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
  private listeners = new Map<() => void, readonly ReadingChange[]>();
  private historyRaw: string | null | undefined;
  private cachedData: ReadingData = { sessions: [] };
  private progressRaw: string | null | undefined;
  private progress: ReadingProgress[] = [];
  private recentRaw: string | null | undefined;
  private recentDisabled: string | null | undefined;

  constructor(private repo = new StorageRepository()) {
    this.data = this.readData();
    this.loadRecentEntries();
    this.updateVisitedPaths();
    // Migrate legacy duplicate visits and oversized lists once, keeping positions.
    if (this.historyRaw !== null) {
      this.persistContexts(this.load());
      this.data = this.readData();
    }
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

  subscribe(
    listener: () => void,
    changes: readonly ReadingChange[] = ['entries', 'sessions', 'progress'],
  ): () => void {
    this.listeners.set(listener, changes);
    return () => this.listeners.delete(listener);
  }

  reload(): void {
    const previousData = this.cachedData;
    const previousProgress = this.progress;
    const previousEntries = this.recentEntries;
    this.data = this.readData();
    this.loadRecentEntries();
    const changes: ReadingChange[] = [];
    if (previousEntries !== this.recentEntries) {
      this.updateVisitedPaths();
      changes.push('entries');
    }
    if (previousData !== this.cachedData) changes.push('sessions');
    if (previousProgress !== this.progress) changes.push('progress');
    this.notify(changes);
  }

  saveSession(session: ReadingSession): void {
    const next = this.load();
    const existing = next.sessions.find((item) => item.id === session.id);
    const params = new URLSearchParams(session.searchQuery);
    params.delete('articleKey');
    const bounded = {
      ...session,
      searchQuery: params.size ? `?${params}` : '',
      articleList: articleWindow(
        session.articleList,
        session.path,
        SESSION_ARTICLE_LIMIT,
      ),
    };
    const contextChanged = !existing || !sameContext(existing, bounded);
    if (contextChanged) {
      next.sessions = [
        bounded,
        ...next.sessions.filter((item) => item.id !== session.id),
      ].slice(0, SESSION_LIMIT);
      this.persistContexts(next);
    }
    const progress = this.loadProgress();
    const previous = progress.find((item) => item.id === session.id);
    // Repeated visibility/pagehide checkpoints must not rewrite either payload.
    const positionChanged =
      !previous ||
      previous.path !== session.path ||
      previous.scrollY !== session.scrollY;
    if (contextChanged || positionChanged) {
      const sessionIds = new Set(next.sessions.map((item) => item.id));
      this.persistProgress(
        [
          {
            id: session.id,
            path: session.path,
            scrollY: session.scrollY,
            updatedAt: session.updatedAt,
          },
          ...progress.filter(
            (item) => item.id !== session.id && sessionIds.has(item.id),
          ),
        ].slice(0, SESSION_LIMIT),
      );
    }
    this.data = this.readData();
    this.notify(
      contextChanged
        ? ['sessions', 'progress']
        : positionChanged
          ? ['progress']
          : [],
    );
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
    this.persistContexts(next);
    const sessionIds = new Set(next.sessions.map((session) => session.id));
    this.persistProgress(
      this.loadProgress().filter((item) => sessionIds.has(item.id)),
    );
    this.data = this.readData();
    this.notify(['sessions']);
  }

  private notify(changes: readonly ReadingChange[]): void {
    if (!changes.length) return;
    this.listeners.forEach((observed, listener) => {
      if (changes.some((change) => observed.includes(change))) listener();
    });
  }

  private persistContexts(data: ReadingData): void {
    let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
    const sessions = data.sessions.map((session, index) => {
      // Reserve at least the current article for every older context.
      const reserved = data.sessions.length - index - 1;
      const limit = Math.max(
        1,
        Math.min(SESSION_ARTICLE_LIMIT, remaining - reserved),
      );
      const articleList = articleWindow(
        session.articleList,
        session.path,
        limit,
      );
      remaining -= articleList.length;
      return { ...session, articleList };
    });
    const raw = JSON.stringify({ sessions });
    this.repo.setItem(READING_HISTORY_KEY, raw);
    this.historyRaw = raw;
    this.cachedData = { sessions };
  }

  private persistProgress(progress: ReadingProgress[]): void {
    const raw = JSON.stringify(progress);
    this.repo.setItem(READING_PROGRESS_KEY, raw);
    this.progressRaw = raw;
    this.progress = progress;
  }

  private loadProgress(): ReadingProgress[] {
    const raw = this.repo.getItem(READING_PROGRESS_KEY);
    if (raw === this.progressRaw) return this.progress;
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      parsed = [];
    }
    this.progressRaw = raw;
    this.progress = (Array.isArray(parsed) ? parsed : [])
      .filter(
        (item): item is ReadingProgress =>
          isRecord(item) &&
          typeof item.id === 'string' &&
          typeof item.path === 'string' &&
          typeof item.scrollY === 'number' &&
          Number.isFinite(item.scrollY) &&
          item.scrollY >= 0 &&
          timestamp(item.updatedAt) > 0,
      )
      .slice(0, SESSION_LIMIT);
    return this.progress;
  }

  private readData(): ReadingData {
    const data = this.load();
    const progress = new Map(
      this.loadProgress().map((item) => [item.id, item]),
    );
    const order = new Map([...progress.keys()].map((id, index) => [id, index]));
    return {
      sessions: data.sessions
        .map((session) => {
          const position = progress.get(session.id);
          return position &&
            position.path === session.path &&
            position.updatedAt >= session.updatedAt
            ? {
                ...session,
                scrollY: position.scrollY,
                updatedAt: position.updatedAt,
              }
            : session;
        })
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt ||
            (order.get(a.id) ?? SESSION_LIMIT) -
              (order.get(b.id) ?? SESSION_LIMIT),
        ),
    };
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
    const recentRaw = this.repo.getItem(SITE_RECENT_KEY);
    const disabled = this.repo.getItem(SITE_RECENT_DISABLED_KEY);
    if (recentRaw === this.recentRaw && disabled === this.recentDisabled)
      return;
    this.recentRaw = recentRaw;
    this.recentDisabled = disabled;
    this.recentEntries = [];
    if (disabled) return;
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
    const serialized = this.repo.getItem(READING_HISTORY_KEY);
    if (serialized === this.historyRaw)
      return { sessions: [...this.cachedData.sessions] };
    this.historyRaw = serialized;
    const raw = this.repo.getJSON<unknown>(READING_HISTORY_KEY);
    if (!isRecord(raw)) {
      this.cachedData = { sessions: [] };
      return { sessions: [] };
    }
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
        articleList: articleWindow(
          normalizeArticles(item.articleList, origin),
          path,
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
    this.cachedData = { sessions };
    return { sessions: [...sessions] };
  }
}
