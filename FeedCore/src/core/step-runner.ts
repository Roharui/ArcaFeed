import type { PromiseFunc, PromiseFuncResult } from '../types/func';

export interface FlushableVault {
  flushSave(): void;
}

/**
 * A Step is either a single function (run sequentially) or an array
 * of functions (run in parallel).
 */
export type Step<TVault extends FlushableVault = FlushableVault> =
  | PromiseFunc<TVault>
  | PromiseFunc<TVault>[];

/**
 * Lightweight step runner with explicit sequential/parallel step definitions.
 */
export class StepRunner<TVault extends FlushableVault = FlushableVault> {
  constructor(
    private flushStorage: () => Promise<void> = () => Promise.resolve(),
  ) {}

  /**
   * Execute steps sequentially. Arrays within steps run in parallel.
   * Dynamic follow-ups (functions returning functions) are supported.
   */
  async run(p: TVault, steps: Step<TVault>[]): Promise<void> {
    for (const step of steps) {
      // Wait for every parallel task even on failure. Otherwise the next command
      // could mutate state while a task from the failed command is still running.
      const settled = await Promise.allSettled(
        (Array.isArray(step) ? step : [step]).map((fn) => this.invoke(p, fn)),
      );
      const results: PromiseFuncResult<TVault>[] = settled.map((result) => {
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
    await this.flushStorage();
  }

  private async invoke(
    p: TVault,
    fn: PromiseFunc<TVault>,
  ): Promise<PromiseFuncResult<TVault>> {
    try {
      const result = await fn(p);
      if (
        result &&
        typeof result === 'object' &&
        'ok' in result &&
        !result.ok
      ) {
        throw result.errors[0] ?? new Error('Command failed');
      }
      return result;
    } catch (error) {
      console.error(`[StepRunner] Error in ${fn.name || 'anonymous'}:`, error);
      throw error;
    }
  }

  /**
   * Extract follow-up functions from step results.
   */
  private collectFollowUps(
    results: PromiseFuncResult<TVault>[],
  ): PromiseFunc<TVault>[] {
    const followUps: PromiseFunc<TVault>[] = [];

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
