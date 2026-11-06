import { mergeState } from '@/vault/lazy-state';
import { OperationError, reportFailure } from '@/utils/operation-error';
import type { VaultAdapter } from '@/vault';
import type { AppState } from '@/vault/store';

const navigating = new WeakSet<VaultAdapter>();
const observed = new WeakSet<VaultAdapter>();

export function captureNavigationState(p: VaultAdapter): Partial<AppState> {
  const fields = [
    'href',
    'activeIndex',
    'articleKey',
    'articleList',
    'isSeriesMode',
    'isScrapMode',
    'seriesChannels',
    'subscriptionFailures',
    'searchQuery',
    'lastActiveIndex',
  ] as const;
  const state = p.getState();
  return Object.defineProperties(
    {},
    Object.fromEntries(
      fields.map((key) => [
        key,
        Object.getOwnPropertyDescriptor(state, key) ?? {
          value: state[key],
          enumerable: true,
        },
      ]),
    ),
  );
}

export function restoreNavigationState(
  p: VaultAdapter,
  previous: Partial<AppState>,
): void {
  p.updateState(previous);
  p.invalidateSavedState();
  p.flushSave();
}

export function isNavigating(p: VaultAdapter): boolean {
  return navigating.has(p);
}

interface NavigationOptions {
  patch?: Partial<AppState>;
  prepare?: () => void;
  suspend?: () => () => void;
  rollback?: () => void;
  stayOnPage?: boolean;
}

/** Save first; failed persistence or browser calls leave this page retryable. */
export function navigate(
  p: VaultAdapter,
  move: () => void,
  options: NavigationOptions = {},
): boolean {
  if (navigating.has(p)) return false;
  navigating.add(p);
  if (!observed.has(p)) {
    observed.add(p);
    window.addEventListener?.('pageshow', (event) => {
      if (event.persisted) {
        navigating.delete(p);
        p.invalidateSavedState();
      }
    });
  }
  const previous: Partial<AppState> = {};
  let restoreSuspension: (() => void) | undefined;
  let saved = false;
  try {
    const state = p.getState();
    for (const key of Object.keys(options.patch ?? {}) as (keyof AppState)[]) {
      Object.defineProperty(
        previous,
        key,
        Object.getOwnPropertyDescriptor(state, key) ?? {
          value: state[key],
          enumerable: true,
        },
      );
    }
    restoreSuspension = options.suspend?.();
    if (options.patch) p.updateState(options.patch);
    p.flushSave();
    saved = true;
    try {
      options.prepare?.();
    } catch (error) {
      throw error instanceof OperationError
        ? error
        : new OperationError(
            'storage',
            '탐색 정보를 저장하지 못했습니다. 다시 시도해주세요.',
            error,
          );
    }
    move();
    if (options.stayOnPage) navigating.delete(p);
    return true;
  } catch (error) {
    const recoveryErrors: unknown[] = [];
    try {
      if (options.patch) p.updateState(mergeState(previous));
    } catch (recovery) {
      recoveryErrors.push(recovery);
    }
    try {
      p.swiper?.slideTo?.(1, 0, false);
    } catch (recovery) {
      recoveryErrors.push(recovery);
    }
    try {
      restoreSuspension?.();
    } catch (recovery) {
      recoveryErrors.push(recovery);
    }
    try {
      options.rollback?.();
    } catch (recovery) {
      recoveryErrors.push(recovery);
    }
    try {
      p.invalidateSavedState();
      p.flushSave();
    } catch (recovery) {
      recoveryErrors.push(recovery);
    }
    navigating.delete(p);
    if (recoveryErrors.length)
      console.error(
        '[ArcaFeed] Navigation recovery could not finish persistence:',
        recoveryErrors,
      );
    throw reportFailure(
      error instanceof OperationError && error.kind !== 'storage'
        ? error
        : new OperationError(
            !saved ||
            (error instanceof OperationError && error.kind === 'storage')
              ? 'storage'
              : 'navigation',
            saved &&
            !(error instanceof OperationError && error.kind === 'storage')
              ? '이동하지 못했습니다. 현재 화면에서 다시 시도해주세요.'
              : '저장하지 못해 이동을 중단했습니다. 저장 공간·브라우저 설정을 확인한 뒤 다시 시도해주세요.',
            error,
          ),
    );
  }
}
