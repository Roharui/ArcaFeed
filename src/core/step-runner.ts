import type { VaultAdapter } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';
import { isPromiseFuncResult } from '@/utils';

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
   * Dynamic follow-ups (functions returning functions) are supported
   * for backward compatibility during migration.
   */
  async run(p: VaultAdapter, steps: Step[]): Promise<void> {
    for (const step of steps) {
      const fns = Array.isArray(step) ? step : [step];

      const results: PromiseFuncResult[] = await Promise.all(
        fns.map((fn) => {
          try {
            return fn(p);
          } catch (err) {
            console.error(`[StepRunner] Error in ${fn.name || 'anonymous'}:`, err);
            if (process.env.NODE_ENV === 'development') throw err;
            return undefined;
          }
        }),
      );

      // Process dynamic follow-ups from results
      const followUps = this.collectFollowUps(results);
      for (const followUp of followUps) {
        try {
          await followUp(p);
        } catch (err) {
          console.error(`[StepRunner] Error in follow-up:`, err);
          if (process.env.NODE_ENV === 'development') throw err;
        }
      }
    }

    p.flushSave();
  }

  /**
   * Extract follow-up functions from step results.
   * Maintains compatibility with existing functions that return
   * `[p, nextFn]` or bare functions.
   */
  private collectFollowUps(results: PromiseFuncResult[]): PromiseFunc[] {
    const followUps: PromiseFunc[] = [];

    for (const r of results.flat()) {
      const resultType = isPromiseFuncResult(r);
      switch (resultType) {
        case 'Function':
          followUps.push(r as PromiseFunc);
          break;
        case 'Param':
          // State updates are handled by VaultAdapter setters
          break;
        case 'void':
          break;
      }
    }

    return followUps;
  }
}
