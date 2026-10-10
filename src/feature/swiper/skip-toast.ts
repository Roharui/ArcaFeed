import { showToast } from '@/utils/toast';

const STORAGE_KEY = 'arcaFeed:skippedVisitedToast';

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
    showSkippedToast(count);
  }
}

export function showPendingSkippedToast(path: string): void {
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
