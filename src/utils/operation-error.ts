import { showToast } from '@/utils/toast';

export class OperationError extends Error {
  reported = false;
  constructor(
    readonly kind: 'storage' | 'navigation' | 'command',
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OperationError';
  }
}

/** Report a failure once across direct handlers, the runner and the event bus. */
export function reportFailure(error: unknown): OperationError {
  const failure =
    error instanceof OperationError
      ? error
      : new OperationError(
          'command',
          '작업을 완료하지 못했습니다. 현재 화면에서 다시 시도해주세요.',
          error,
        );
  if (!failure.reported) {
    failure.reported = true;
    console.error('[ArcaFeed] Operation failed:', failure);
    try {
      showToast(failure.message, 5000);
    } catch (reportError) {
      console.error('[ArcaFeed] Could not display failure:', reportError);
    }
  }
  return failure;
}
