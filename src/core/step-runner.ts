import type { VaultAdapter } from '@/vault';
import type { PromiseFunc } from '@/types';

/**
 * A Step is either a single function (run sequentially) or an array
 * of functions (run in parallel).
 */
export type Step = PromiseFunc | PromiseFunc[];

/**
 * Lightweight step runner - replaces the complex PromiseManager
 * with explicit sequential/parallel step definitions.
 *
 * Usage:
 *   await runner.run(p, [
 *     [fn1, fn2],    // Step 1: parallel
 *     fn3,            // Step 2: sequential
 *     [fn4, fn5],    // Step 3: parallel
 *   ]);
 */
export class StepRunner {
  /**
   * Execute steps sequentially. Arrays within steps run in parallel.
   * A failure aborts the remaining steps and is reported by the event queue.
   * State is flushed in a finally block so completed updates are not lost.
   */
  async run(p: VaultAdapter, steps: Step[]): Promise<void> {
    try {
      for (const step of steps) {
        const functions = Array.isArray(step) ? step : [step];
        const results = await Promise.allSettled(
          functions.map((fn) => Promise.resolve().then(() => fn(p))),
        );
        const failures = results.flatMap((result, index) => {
          if (result.status === 'fulfilled') return [];
          const fn = functions[index];
          console.error(
            `[StepRunner] Error in ${fn?.name || 'anonymous'}:`,
            result.reason,
          );
          return [result.reason];
        });

        if (failures.length > 0) {
          throw failures[0];
        }
      }
    } finally {
      p.flushSave();
    }
  }
}
