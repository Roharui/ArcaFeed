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
      // Wait for every parallel task even on failure. Otherwise the next command
      // could mutate state while a task from the failed command is still running.
      const settled = await Promise.allSettled(
        (Array.isArray(step) ? step : [step]).map((fn) => this.invoke(p, fn)),
      );
      const results: PromiseFuncResult[] = settled.map((result) => {
        if (result.status === 'rejected') throw result.reason;
        return result.value;
      });

      // Process dynamic follow-ups from results
      const followUps = this.collectFollowUps(results);
      for (const followUp of followUps) {
        await this.invoke(p, followUp);
      }
    }

    p.flushSave();
  }

  private async invoke(
    p: VaultAdapter,
    fn: PromiseFunc,
  ): Promise<PromiseFuncResult> {
    try {
      return await fn(p);
    } catch (error) {
      console.error(`[StepRunner] Error in ${fn.name || 'anonymous'}:`, error);
      throw error;
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
