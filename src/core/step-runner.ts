import type { VaultAdapter } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

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
      const results: PromiseFuncResult[] = Array.isArray(step)
        ? await Promise.all(step.map((fn) => this.invoke(p, fn)))
        : [await this.invoke(p, step)];

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

  private invoke(p: VaultAdapter, fn: PromiseFunc): ReturnType<PromiseFunc> {
    try {
      return fn(p);
    } catch (error) {
      console.error(`[StepRunner] Error in ${fn.name || 'anonymous'}:`, error);
      if (process.env.NODE_ENV === 'development') throw error;
      return undefined;
    }
  }

  /**
   * Extract follow-up functions from step results.
   * Maintains compatibility with existing functions that return
   * `[p, nextFn]` or bare functions.
   */
  private collectFollowUps(results: PromiseFuncResult[]): PromiseFunc[] {
    const followUps: PromiseFunc[] = [];

    for (const result of results) {
      if (typeof result === 'function') {
        followUps.push(result);
      } else if (Array.isArray(result)) {
        for (const item of result) {
          if (typeof item === 'function') followUps.push(item);
        }
      }
    }

    return followUps;
  }
}
