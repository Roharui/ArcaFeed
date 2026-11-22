import { showToast } from '@/utils/toast';

const STORAGE_KEY = 'ruliFeed:skippedVisitedToast';
const QUERY_KEY = 'ruliFeedSkipped';
let carriedCount = 0;

// Read the navigation handoff before ConfigService captures search/filter state.
export function captureSkippedToast(): void {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(QUERY_KEY);
  if (raw === null) return;
  const count = Number(raw);
  carriedCount = Number.isSafeInteger(count) && count > 0 ? count : 0;
  url.searchParams.delete(QUERY_KEY);
  window.history.replaceState(window.history.state, '', url.href);
}

export function skippedToastURL(destination: string, count: number): string {
  if (count === 0) return destination;
  const url = new URL(destination, window.location.href);
  url.searchParams.set(QUERY_KEY, String(count));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function showSkippedToast(count: number): void {
  showToast(`최근 본 글 ${count}개를 건너뛰었습니다`);
}

export function clearSkippedToast(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Navigation still works when session storage is unavailable.
  }
}

export function queueSkippedToast(path: string, count: number): void {
  clearSkippedToast();
  if (count === 0) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ path, count, expiresAt: Date.now() + 60_000 }),
    );
  } catch {
    // The URL handoff remains available when session storage is blocked.
  }
}

export function showPendingSkippedToast(path: string): void {
  if (carriedCount > 0) {
    const count = carriedCount;
    carriedCount = 0;
    clearSkippedToast();
    showSkippedToast(count);
    return;
  }
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  clearSkippedToast();
  if (!raw) return;
  try {
    const pending = JSON.parse(raw);
    if (
      pending?.path === path &&
      Number.isSafeInteger(pending.count) &&
      pending.count > 0 &&
      typeof pending.expiresAt === 'number' &&
      pending.expiresAt > Date.now()
    )
      showSkippedToast(pending.count);
  } catch {
    // Ignore malformed or stale notifications.
  }
}
