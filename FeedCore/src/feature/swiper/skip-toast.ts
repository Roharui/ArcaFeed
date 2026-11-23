export interface CreateSkipToastOptions {
  storageKey: string;
  queryKey: string;
  showToast: (message: string, duration?: number) => void;
  matchesDestination?: (destination: unknown, path: string) => boolean;
}

export function createSkipToast({
  storageKey,
  queryKey,
  showToast,
  matchesDestination = (destination, path) => destination === path,
}: CreateSkipToastOptions) {
  let carriedCount = 0;

  // Read the navigation handoff before ConfigService captures search/filter state.
  function captureSkippedToast(): void {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(queryKey);
    if (raw === null) return;
    const count = Number(raw);
    carriedCount = Number.isSafeInteger(count) && count > 0 ? count : 0;
    url.searchParams.delete(queryKey);
    window.history.replaceState(window.history.state, '', url.href);
  }

  function skippedToastURL(destination: string, count: number): string {
    if (count === 0) return destination;
    const url = new URL(destination, window.location.href);
    url.searchParams.set(queryKey, String(count));
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function showSkippedToast(count: number): void {
    showToast(`최근 본 글 ${count}개를 건너뛰었습니다`);
  }

  function clearSkippedToast(): void {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Navigation still works when session storage is unavailable.
    }
  }

  function queueSkippedToast(path: string, count: number): void {
    clearSkippedToast();
    if (count === 0) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ path, count, expiresAt: Date.now() + 60_000 }),
      );
    } catch {
      // The URL handoff remains available when session storage is blocked.
    }
  }

  function showPendingSkippedToast(path: string): void {
    if (carriedCount > 0) {
      const count = carriedCount;
      carriedCount = 0;
      clearSkippedToast();
      showSkippedToast(count);
      return;
    }
    let raw: string | null;
    try {
      raw = sessionStorage.getItem(storageKey);
    } catch {
      return;
    }
    clearSkippedToast();
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      if (
        matchesDestination(pending?.path, path) &&
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

  return {
    captureSkippedToast,
    skippedToastURL,
    showSkippedToast,
    clearSkippedToast,
    queueSkippedToast,
    showPendingSkippedToast,
  };
}
