import type { StorageRepository } from './repository';
import { cleanQuery, storedMode } from './navigation-record';
import { equalData, isRecord } from './record-schema';
import type { DataRow } from './record-schema';
import { deferField, mergeState } from './lazy-state';
import { articleWindow, sessionArticleLimit } from './article-window';
import {
  SESSION_LIMIT,
  SESSION_ARTICLE_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
} from './storage-keys';
import type { ReadingSession } from './reading-session-schema';

export type { ReadingSession } from './reading-session-schema';

export type ReadingChange = 'entries' | 'sessions' | 'progress';

export interface SiteRecentHistoryLike<TEntry> {
  readonly entries: readonly TEntry[];
  hasVisited(path: string): boolean;
  getVisitedPaths(): Set<string>;
  reload(): boolean;
  reloadIfLoaded(): boolean;
}

export interface ReadingHistoryOptions<TEntry> {
  createSiteHistory: (repo: StorageRepository) => SiteRecentHistoryLike<TEntry>;
  normalizeArticles: (value: unknown, origin: string) => string[];
  normalizeSessionMetadata: (
    value: unknown,
    origin: string,
  ) => Omit<ReadingSession, 'articleList'> | null;
  contextKey: (session: DataRow) => string[];
}

interface ReadingData {
  sessions: ReadingSession[];
}

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
    (a.customName || '') === (b.customName || '') &&
    !!a.pinned === !!b.pinned &&
    a.path === b.path &&
    a.searchQuery === b.searchQuery &&
    a.isSeriesMode === b.isSeriesMode &&
    a.isScrapMode === b.isScrapMode &&
    sameList(a.seriesChannels, b.seriesChannels) &&
    sameList(a.articleList, b.articleList)
  );
}

function validTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

/** Read the site's recent history; persist only Feed resume positions. */
export class ReadingHistory<TEntry = unknown> {
  private data: ReadingData = { sessions: [] };
  private sessionsLoaded = false;
  private contextsLoaded = false;
  private listCounts = new WeakMap<ReadingSession, number>();
  private siteHistory: SiteRecentHistoryLike<TEntry>;
  private listeners = new Map<() => void, readonly ReadingChange[]>();
  private historyRaw: readonly DataRow[] | undefined;
  private cachedData: ReadingData = { sessions: [] };
  private progressRaw: readonly DataRow[] | undefined;
  private progress: ReadingProgress[] = [];
  private savedPositionContext?: {
    id: string;
    path: string;
    raw: DataRow | undefined;
  };

  constructor(
    private repo: StorageRepository,
    private options: ReadingHistoryOptions<TEntry>,
  ) {
    // Each independent payload is loaded by the first getter or operation that needs it.
    this.siteHistory = this.options.createSiteHistory(this.repo);
  }

  private ensureSessions(): void {
    if (this.sessionsLoaded) return;
    this.sessionsLoaded = true;
    this.data = this.readData();
  }

  hasSession(id: string): boolean {
    const contexts = this.load();
    return contexts.sessions.some((session) => session.id === id);
  }

  getContextId(
    mode: string,
    channelId: string,
    articleKey: string,
    query: string,
  ): string {
    const key =
      mode === 'channel'
        ? ['channel', channelId, cleanQuery(query)]
        : ['series', articleKey];
    const found = this.repo
      .resumes()
      .find(
        (row) =>
          Array.isArray(row.contextKey) &&
          row.contextKey.length === key.length &&
          row.contextKey.every(
            (part: string, index: number) => part === key[index],
          ),
      );
    return (
      found?.id ??
      (mode === 'channel' ? JSON.stringify(key) : `series:${articleKey}`)
    );
  }

  get entries(): readonly TEntry[] {
    return this.siteHistory.entries;
  }

  get sessions(): readonly ReadingSession[] {
    this.ensureSessions();
    return this.data.sessions;
  }

  hasVisited(path: string): boolean {
    return this.siteHistory.hasVisited(path);
  }

  getVisitedPaths(): Set<string> {
    return this.siteHistory.getVisitedPaths();
  }

  subscribe(
    listener: () => void,
    changes: readonly ReadingChange[] = ['entries', 'sessions', 'progress'],
  ): () => void {
    this.listeners.set(listener, changes);
    return () => this.listeners.delete(listener);
  }

  reload(
    requested: readonly ReadingChange[] = ['entries', 'sessions', 'progress'],
  ): void {
    const previousData = this.cachedData;
    const previousProgress = this.progress;
    if (this.contextsLoaded && requested.includes('sessions')) {
      if (this.sessionsLoaded) this.data = this.readData();
      else this.load();
    } else if (this.sessionsLoaded && requested.includes('progress')) {
      this.data = this.readData({ sessions: this.cachedData.sessions });
    }
    const entriesChanged = requested.includes('entries')
      ? this.siteHistory.reload()
      : false;

    const changes: ReadingChange[] = [];
    if (entriesChanged) changes.push('entries');
    if (previousData !== this.cachedData) changes.push('sessions');
    if (previousProgress !== this.progress) changes.push('progress');
    this.notify(changes);
  }

  reloadSessionList(changes: readonly ReadingChange[] = []): void {
    if (!this.contextsLoaded) return;
    this.historyRaw = undefined;
    this.reload(['sessions', ...changes]);
  }

  /** Re-read site visits on page load only if something already consumed them. */
  reloadEntriesIfLoaded(): void {
    if (this.siteHistory.reloadIfLoaded()) this.notify(['entries']);
  }

  prepareList(id: string): Promise<void> | undefined {
    return this.repo.prepareLists([id]);
  }

  /** Prepare the compared context and only the old lists that need budget trimming. */
  prepareSession(session: ReadingSession): Promise<void> | undefined {
    const contexts = this.load().sessions;
    const existing = contexts.find((item) => item.id === session.id);
    const next = this.sortContexts([
      { ...session, pinned: !!(existing?.pinned ?? session.pinned) },
      ...contexts.filter((item) => item.id !== session.id),
    ]).slice(0, SESSION_LIMIT);
    const keys = [session.id];
    let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
    for (const [index, item] of next.entries()) {
      const count =
        item.id === session.id
          ? Math.min(SESSION_ARTICLE_LIMIT, session.articleList.length)
          : (this.listCounts.get(item) ?? 1);
      const limit = sessionArticleLimit(remaining, next.length - index - 1);
      if (count > limit) keys.push(item.id);
      remaining -= Math.min(count, limit);
    }
    return this.repo.prepareLists(keys);
  }

  saveSession(session: ReadingSession): boolean {
    this.ensureSessions();
    const next = this.load();
    const existing = next.sessions.find((item) => item.id === session.id);
    if (
      !existing &&
      next.sessions.length >= SESSION_LIMIT &&
      next.sessions.every((item) => item.pinned)
    )
      return false;

    const bounded = this.boundIncomingSession(session, existing);
    const contextChanged = !existing || !sameContext(existing, bounded);
    if (contextChanged) {
      next.sessions = [
        bounded,
        ...next.sessions.filter((item) => item.id !== session.id),
      ];
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
      this.persistSessionPosition(
        next.sessions,
        progress,
        session.id,
        session.path,
        session.scrollY,
        session.updatedAt,
      );
    }

    this.data = this.readData();
    this.savedPositionContext = {
      id: session.id,
      path: session.path,
      raw: this.repo.resumes().find((row) => row.id === session.id),
    };
    this.notify(
      contextChanged
        ? ['sessions', 'progress']
        : positionChanged
          ? ['progress']
          : [],
    );
    return true;
  }

  /** Edit summaries; touch lists only if the new pin order needs budget trimming. */
  updateSession(
    id: string,
    patch: { customName?: string; pinned?: boolean },
  ): void {
    this.ensureSessions();
    const next = this.load();
    const existing = next.sessions.find((item) => item.id === id);
    if (!existing) return;
    const updated = mergeState(existing, {
      ...(typeof patch.customName === 'string'
        ? { customName: patch.customName.trim().slice(0, 100) }
        : {}),
      ...(typeof patch.pinned === 'boolean' ? { pinned: patch.pinned } : {}),
    });
    if (
      updated.customName === existing.customName &&
      !!updated.pinned === !!existing.pinned
    )
      return;
    this.listCounts.set(updated, this.listCounts.get(existing)!);
    next.sessions = next.sessions.map((item) =>
      item.id === id ? updated : item,
    );
    this.persistContexts(next, true);
    this.data = this.readData();
    this.notify(['sessions']);
  }

  removeSession(id: string): void {
    this.change((data) => {
      data.sessions = data.sessions.filter((item) => item.id !== id);
    });
  }

  /** Update position without copying links while the saved context is intact. */
  savePosition(
    id: string,
    path: string,
    scrollY: number,
    updatedAt: number,
  ): boolean {
    const context = this.savedPositionContext;
    const current = this.repo.resumes().find((row) => row.id === id);
    if (
      context?.id !== id ||
      context.path !== path ||
      !current ||
      !equalData({ ...current, revision: 0 }, { ...context.raw, revision: 0 })
    )
      return false;
    const progress = this.loadProgress();
    const previous = progress.find((item) => item.id === id);
    if (previous?.path === path && previous.scrollY === scrollY) return true;
    this.persistSessionPosition(
      this.cachedData.sessions,
      progress,
      id,
      path,
      scrollY,
      updatedAt,
    );
    this.data = this.readData();
    this.notify(['progress']);
    return true;
  }

  clear(): void {
    this.change((data) => {
      data.sessions = [];
    });
  }

  private boundIncomingSession(
    session: ReadingSession,
    existing: ReadingSession | undefined,
  ): ReadingSession {
    const params = new URLSearchParams(session.searchQuery);
    params.delete('articleKey');
    return {
      ...session,
      // Automatic checkpoints may not overwrite a name or pin changed in another tab.
      ...(existing
        ? { customName: existing.customName || '', pinned: !!existing.pinned }
        : {}),
      searchQuery: params.size ? `?${params}` : '',
      articleList: articleWindow(
        session.articleList,
        session.path,
        SESSION_ARTICLE_LIMIT,
      ),
    };
  }

  private persistSessionPosition(
    sessions: readonly ReadingSession[],
    progress: readonly ReadingProgress[],
    id: string,
    path: string,
    scrollY: number,
    updatedAt: number,
  ): void {
    const sessionIds = new Set(sessions.map((item) => item.id));
    this.persistProgress(
      [
        { id, path, scrollY, updatedAt },
        ...progress.filter((item) => item.id !== id && sessionIds.has(item.id)),
      ].slice(0, SESSION_LIMIT),
    );
  }

  /** Merge each checkpoint operation with disk so tabs preserve each other's positions. */
  private change(mutate: (data: ReadingData) => void): void {
    this.ensureSessions();
    const next = this.load();
    mutate(next);
    this.persistContexts(next, false, false);
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

  private sortContexts(sessions: readonly ReadingSession[]): ReadingSession[] {
    const positions = new Map(
      this.repo.resumeProgress().map((row) => [row.id, row]),
    );
    const date = (session: ReadingSession) => {
      const position = positions.get(session.id);
      return position?.path === session.path &&
        Number.isFinite(position.updatedAt)
        ? Math.max(session.updatedAt, position.updatedAt)
        : session.updatedAt;
    };
    return [...sessions].sort(
      (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || date(b) - date(a),
    );
  }

  private persistContexts(
    data: ReadingData,
    preserveLists = false,
    automatic = true,
  ): void {
    data.sessions = this.sortContexts(data.sessions).slice(0, SESSION_LIMIT);
    const previousIds = new Set(
      this.cachedData.sessions.map((session) => session.id),
    );
    const { sessions, versions } = this.trimSessionLists(
      data.sessions,
      preserveLists,
    );
    this.saveResumeSummaries(sessions, versions, preserveLists);

    const retained = new Set(sessions.map((session) => session.id));
    for (const id of previousIds) {
      if (!retained.has(id))
        this.repo.deleteSession('resume', id, automatic && !preserveLists);
    }
    this.historyRaw = this.repo.resumes();
    this.cachedData = { sessions };
  }

  private trimSessionLists(
    orderedSessions: readonly ReadingSession[],
    preserveLists: boolean,
  ): { sessions: ReadingSession[]; versions: Map<string, string> } {
    let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
    const versions = new Map<string, string>();
    const sessions = orderedSessions.map((session, index) => {
      const count = this.listCounts.get(session) ?? session.articleList.length;
      const limit = sessionArticleLimit(
        remaining,
        orderedSessions.length - index - 1,
      );
      const lazy = !!Object.getOwnPropertyDescriptor(session, 'articleList')
        ?.get;
      let bounded = session;
      let articleCount = count;
      if ((!lazy && !preserveLists) || count > limit) {
        const articleList = articleWindow(
          session.articleList,
          session.path,
          limit,
        );
        versions.set(
          session.id,
          this.repo.saveList('resume', session.id, articleList),
        );
        bounded = mergeState(session, { articleList });
        articleCount = articleList.length;
      }
      remaining -= articleCount;
      this.listCounts.set(bounded, articleCount);
      return bounded;
    });
    return { sessions, versions };
  }

  private saveResumeSummaries(
    sessions: readonly ReadingSession[],
    versions: ReadonlyMap<string, string>,
    preserveLists: boolean,
  ): void {
    const existingById = new Map(
      this.repo.resumes().map((row) => [row.id, row]),
    );
    for (const session of sessions) {
      const existing = existingById.get(session.id);
      const mode = storedMode(
        session.isSeriesMode,
        session.isScrapMode,
        session.seriesChannels,
      );
      this.repo.saveResume(
        {
          id: session.id,
          label: session.label,
          customName: session.customName || '',
          pinned: !!session.pinned,
          path: session.path,
          query: cleanQuery(session.searchQuery),
          mode,
          channels: [...session.seriesChannels],
          updatedAt: session.updatedAt,
          articleCount: this.listCounts.get(session)!,
          listVersion: versions.get(session.id) ?? existing?.listVersion,
          contextKey:
            existing?.contextKey ??
            this.options.contextKey({
              ...session,
              mode,
              query: session.searchQuery,
            }),
        },
        !preserveLists,
      );
    }
  }

  private persistProgress(progress: ReadingProgress[]): void {
    const retained = new Set(progress.map((item) => item.id));
    for (const item of this.repo.resumeProgress()) {
      if (!retained.has(item.id)) this.repo.deleteResumePosition(item.id);
    }
    for (const item of progress) this.repo.savePosition(item);
    this.progressRaw = this.repo.resumeProgress();
    this.progress = progress;
  }

  private loadProgress(): ReadingProgress[] {
    const raw = this.repo.resumeProgress();
    if (raw === this.progressRaw) return this.progress;
    this.progressRaw = raw;
    this.progress = (Array.isArray(raw) ? raw : [])
      .filter(
        (item): item is ReadingProgress =>
          isRecord(item) &&
          typeof item.id === 'string' &&
          typeof item.path === 'string' &&
          typeof item.scrollY === 'number' &&
          Number.isFinite(item.scrollY) &&
          item.scrollY >= 0 &&
          validTimestamp(item.updatedAt) > 0,
      )
      .slice(0, SESSION_LIMIT);
    return this.progress;
  }

  private readData(data = this.load()): ReadingData {
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
            ? mergeState(session, {
                scrollY: position.scrollY,
                updatedAt: position.updatedAt,
              })
            : session;
        })
        .sort(
          (a, b) =>
            Number(!!b.pinned) - Number(!!a.pinned) ||
            b.updatedAt - a.updatedAt ||
            (order.get(a.id) ?? SESSION_LIMIT) -
              (order.get(b.id) ?? SESSION_LIMIT),
        ),
    };
  }

  private load(): ReadingData {
    this.contextsLoaded = true;
    const serialized = this.repo.resumes();
    if (serialized === this.historyRaw)
      return { sessions: [...this.cachedData.sessions] };
    this.historyRaw = serialized;
    const origin = window.location.origin;
    const sessions: ReadingSession[] = [];
    const seenIds = new Set<string>();
    let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
    const storedSessions: DataRow[] = serialized.map((row) => ({
      ...row,
      searchQuery: row.query,
      isSeriesMode: row.mode !== 'channel',
      isScrapMode: row.mode === 'scrap',
      seriesChannels: row.channels,
    }));
    for (const item of storedSessions) {
      const metadata = this.options.normalizeSessionMetadata(item, origin);
      if (!metadata || seenIds.has(metadata.id) || !isRecord(item)) continue;
      seenIds.add(metadata.id);
      const session: ReadingSession = { ...metadata, articleList: [] };
      const requestedCount =
        typeof item.articleCount === 'number' &&
        Number.isSafeInteger(item.articleCount) &&
        item.articleCount >= 1
          ? Math.min(item.articleCount, SESSION_ARTICLE_LIMIT)
          : 1;
      const reserved =
        Math.min(SESSION_LIMIT, storedSessions.length) - sessions.length - 1;
      const count = Math.max(1, Math.min(requestedCount, remaining - reserved));
      remaining -= count;
      this.listCounts.set(session, count);
      deferField(session, 'articleList', () => {
        const list = this.options.normalizeArticles(
          this.repo.readList('resume', session.id),
          origin,
        );
        return list.length <= count && list.includes(session.path)
          ? list
          : articleWindow(list, session.path, count);
      });
      sessions.push(session);
      if (sessions.length === SESSION_LIMIT) break;
    }
    this.cachedData = { sessions };
    return { sessions: [...sessions] };
  }
}
