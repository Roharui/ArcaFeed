import { normalizeArticlePath } from '@/utils/regex';
import type { StorageRepository } from './repository';

export interface ReadingEntry {
  path: string;
  title: string;
  channelName: string;
  visitedAt: number;
}

export const SITE_RECENT_KEY = 'rulifeed:recentArticles';
export const RECENT_ENTRY_LIMIT = 300;

function readEntries(raw: string | null): ReadingEntry[] {
  try {
    const entries: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(entries)
      ? entries.filter(
          (entry): entry is ReadingEntry =>
            entry &&
            typeof entry.path === 'string' &&
            normalizeArticlePath(entry.path) === entry.path &&
            typeof entry.title === 'string' &&
            typeof entry.channelName === 'string' &&
            Number.isFinite(entry.visitedAt) &&
            entry.visitedAt > 0,
        )
      : [];
  } catch {
    return [];
  }
}

export function recordVisit(
  path: string,
  title: string,
  channelName: string,
): void {
  try {
    const entries = readEntries(localStorage.getItem(SITE_RECENT_KEY));
    localStorage.setItem(
      SITE_RECENT_KEY,
      JSON.stringify(
        [
          {
            path,
            title: title.slice(0, 300),
            channelName: channelName.slice(0, 300),
            visitedAt: Date.now(),
          },
          ...entries.filter((entry) => entry.path !== path),
        ].slice(0, RECENT_ENTRY_LIMIT),
      ),
    );
  } catch {
    // Private browsing or a full storage quota can prevent recording a visit.
  }
}

export function isVisitedPath(
  paths: Set<string> | undefined,
  path: string,
): boolean {
  return paths?.has(path) ?? false;
}

export class SiteRecentHistory {
  private raw: string | null | undefined;
  private recentEntries: ReadingEntry[] = [];
  private paths = new Set<string>();

  constructor(private repo: StorageRepository) {}

  get entries(): readonly ReadingEntry[] {
    this.reloadIfNeeded();
    return this.recentEntries;
  }

  hasVisited(path: string): boolean {
    this.reloadIfNeeded();
    return this.paths.has(path);
  }

  getVisitedPaths(): Set<string> {
    this.reloadIfNeeded();
    return new Set(this.paths);
  }

  reload(): boolean {
    const raw = this.repo.site(SITE_RECENT_KEY);
    if (raw === this.raw) return false;
    this.raw = raw;
    const entries = readEntries(raw).sort((a, b) => b.visitedAt - a.visitedAt);
    this.paths = new Set();
    this.recentEntries = entries
      .filter((entry) => {
        if (this.paths.has(entry.path)) return false;
        this.paths.add(entry.path);
        return true;
      })
      .slice(0, RECENT_ENTRY_LIMIT);
    return true;
  }

  reloadIfLoaded(): boolean {
    return this.raw !== undefined && this.reload();
  }

  private reloadIfNeeded(): void {
    if (this.raw === undefined) this.reload();
  }
}
