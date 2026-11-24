import type { StorageRepository } from './repository';
import { isChannelId, isRecord } from './record-schema';

export interface ReadingEntry {
  path: string;
  title: string;
  channelName: string;
  visitedAt: number;
}

export const SITE_RECENT_KEY = 'recent_articles';
export const SITE_RECENT_DISABLED_KEY = 'recent_disabled';
export const SITE_RECENT_URL = '/u/recents';
export const RECENT_ENTRY_LIMIT = 300;

function validTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function clampText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, 300) : fallback;
}

/** Match aliases from /b/my using the site's globally unique article IDs. */
export function isVisitedPath(
  paths: Set<string> | undefined,
  path: string,
): boolean {
  return (
    !!paths &&
    (paths.has(path) ||
      paths.has(`/b/my/${path.slice(path.lastIndexOf('/') + 1)}`))
  );
}

/** Lazily read and cache the site-owned recent_articles list from localStorage. */
export class SiteRecentHistory {
  private loaded = false;
  private recentEntries: ReadingEntry[] = [];
  private visibleEntries: ReadingEntry[] = [];
  private visitedPaths = new Set<string>();
  private recentRaw: string | null | undefined;
  private recentDisabled: string | null | undefined;

  constructor(private repo: StorageRepository) {}

  get entries(): readonly ReadingEntry[] {
    this.ensureLoaded();
    return this.visibleEntries;
  }

  hasVisited(path: string): boolean {
    this.ensureLoaded();
    return isVisitedPath(this.visitedPaths, path);
  }

  getVisitedPaths(): Set<string> {
    this.ensureLoaded();
    return new Set(this.visitedPaths);
  }

  /** Re-read raw site storage; return true only when the parsed snapshot changed. */
  reload(): boolean {
    this.loaded = true;
    const previous = this.recentEntries;
    this.loadEntries();
    if (previous === this.recentEntries) return false;
    this.updateVisitedPaths();
    return true;
  }

  /** Refresh only when site history has already been read on this page. */
  reloadIfLoaded(): boolean {
    if (!this.loaded) return false;
    return this.reload();
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.loadEntries();
    this.updateVisitedPaths();
  }

  private updateVisitedPaths(): void {
    const paths = new Set<string>();
    for (const { path } of this.recentEntries) {
      paths.add(path);
      paths.add(`/b/my/${path.slice(path.lastIndexOf('/') + 1)}`);
    }
    this.visitedPaths = paths;
  }

  private loadEntries(): void {
    const disabled = this.repo.site(SITE_RECENT_DISABLED_KEY);
    const recentRaw = disabled ? null : this.repo.site(SITE_RECENT_KEY);
    if (recentRaw === this.recentRaw && disabled === this.recentDisabled)
      return;
    this.recentRaw = recentRaw;
    this.recentDisabled = disabled;
    this.recentEntries = [];
    this.visibleEntries = [];
    if (disabled) return;

    let raw: unknown;
    try {
      raw = recentRaw ? JSON.parse(recentRaw) : [];
    } catch {
      raw = [];
    }

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
          ? validTimestamp(item.regdateAt * 1000)
          : 0;
      if (
        !isChannelId(slug) ||
        !/^\d+$/.test(id) ||
        !visitedAt ||
        seenIds.has(id)
      )
        continue;
      seenIds.add(id);
      const path = `/b/${slug}/${id}`;
      this.recentEntries.push({
        path,
        title: clampText(item.title, path),
        channelName: clampText(item.boardName, slug),
        visitedAt,
      });
    }
    this.recentEntries.sort((a, b) => b.visitedAt - a.visitedAt);
    this.visibleEntries = this.recentEntries.slice(0, RECENT_ENTRY_LIMIT);
  }
}
