/** Frozen mobile WebViews must not retain database locks needed by other tabs. */
export class StorageActivity {
  private background =
    typeof document !== 'undefined' && document.visibilityState === 'hidden';
  private transactions = new Set<IDBTransaction>();
  private interrupted = new WeakSet<IDBTransaction>();
  private waiting: Promise<void> | undefined;
  private wake: (() => void) | undefined;

  constructor() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () =>
      this.setBackground(document.visibilityState === 'hidden'),
    );
    document.addEventListener('freeze', () => this.setBackground(true));
    document.addEventListener('resume', () =>
      this.setBackground(document.visibilityState === 'hidden'),
    );
    window.addEventListener('pagehide', () => this.setBackground(true));
    window.addEventListener('pageshow', () =>
      this.setBackground(document.visibilityState === 'hidden'),
    );
  }

  private setBackground(background: boolean): void {
    this.background = background;
    if (!background) {
      this.wake?.();
      this.waiting = undefined;
      this.wake = undefined;
      return;
    }
    for (const tx of this.transactions) {
      try {
        tx.abort();
        this.interrupted.add(tx);
      } catch {
        // A completed transaction has already released its locks.
      }
    }
  }

  async ready(): Promise<void> {
    while (this.background)
      await (this.waiting ??= new Promise((resolve) => {
        this.wake = resolve;
      }));
  }

  async run<T>(
    operation: (track: (tx: IDBTransaction) => void) => Promise<T>,
  ): Promise<T> {
    for (;;) {
      await this.ready();
      if (this.background) continue;
      const tracked: IDBTransaction[] = [];
      try {
        return await operation((tx) => {
          tracked.push(tx);
          this.transactions.add(tx);
        });
      } catch (error) {
        if (!tracked.some((tx) => this.interrupted.has(tx))) throw error;
        // Aborts caused by suspension keep the caller and pending edits alive.
      } finally {
        for (const tx of tracked) this.transactions.delete(tx);
      }
    }
  }
}
