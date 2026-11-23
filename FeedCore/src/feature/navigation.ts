import { OperationError } from '../utils/operation-error';
import { mergeState } from '../vault/lazy-state';
import type { BaseAppState } from '../vault/store';

export interface NavigableVault<TState extends BaseAppState = BaseAppState> {
  getState(): Readonly<TState>;
  updateState(patch: Partial<TState>): void;
  invalidateSavedState(): void;
  flushSave(): void;
  swiper?: {
    slideTo?(index: number, speed?: number, runCallbacks?: boolean): unknown;
  } | null;
}

export interface NavigationOptions<TState extends BaseAppState = BaseAppState> {
  patch?: Partial<TState>;
  prepare?: () => void | Promise<void>;
  suspend?: () => () => void;
  rollback?: () => void | Promise<void>;
  stayOnPage?: boolean;
}

export interface CreateNavigationOptions<TState extends BaseAppState> {
  appName: string;
  captureFields: readonly (keyof TState)[];
  flushStorage: () => Promise<void>;
  reportFailure: (error: unknown) => OperationError;
}

export function createNavigation<
  TState extends BaseAppState,
  TVault extends NavigableVault<TState>,
>({
  appName,
  captureFields,
  flushStorage,
  reportFailure,
}: CreateNavigationOptions<TState>) {
  const navigating = new WeakSet<TVault>();
  const observed = new WeakSet<TVault>();

  function captureNavigationState(p: TVault): Partial<TState> {
    const state = p.getState();
    return Object.defineProperties(
      {},
      Object.fromEntries(
        captureFields.map((key) => [
          key,
          Object.getOwnPropertyDescriptor(state, key) ?? {
            value: state[key],
            enumerable: true,
          },
        ]),
      ),
    );
  }

  async function restoreNavigationState(
    p: TVault,
    previous: Partial<TState>,
  ): Promise<void> {
    p.updateState(previous);
    p.invalidateSavedState();
    p.flushSave();
    await flushStorage();
  }

  function isNavigating(p: TVault): boolean {
    return navigating.has(p);
  }

  /** Save first; failed persistence or browser calls leave this page retryable. */
  async function navigate(
    p: TVault,
    move: () => void,
    options: NavigationOptions<TState> = {},
  ): Promise<boolean> {
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
    const previous: Partial<TState> = {};
    let restoreSuspension: (() => void) | undefined;
    let saved = false;
    try {
      const state = p.getState();
      for (const key of Object.keys(options.patch ?? {}) as (keyof TState)[]) {
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
      try {
        await options.prepare?.();
        await flushStorage();
      } catch (error) {
        throw error instanceof OperationError
          ? error
          : new OperationError(
              'storage',
              '탐색 정보를 저장하지 못했습니다. 다시 시도해주세요.',
              error,
            );
      }
      saved = true;
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
        await options.rollback?.();
      } catch (recovery) {
        recoveryErrors.push(recovery);
      }
      try {
        p.invalidateSavedState();
        p.flushSave();
        await flushStorage();
      } catch (recovery) {
        recoveryErrors.push(recovery);
      }
      navigating.delete(p);
      if (recoveryErrors.length)
        console.error(
          `[${appName}] Navigation recovery could not finish persistence:`,
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

  return {
    captureNavigationState,
    restoreNavigationState,
    isNavigating,
    navigate,
  };
}
