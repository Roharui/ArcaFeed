/** Serialize state-changing commands, including events emitted during a command. */
export class EventQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = new Map<string, Promise<void>>();

  run(command: () => void | Promise<void>, key?: string): Promise<void> {
    if (key !== undefined) {
      const existing = this.pending.get(key);
      if (existing) return existing;
    }
    const result = this.tail.then(command);
    // A failed command must not prevent later commands from running.
    this.tail = result.catch(() => {});
    if (key !== undefined) {
      this.pending.set(key, result);
      const clear = () => {
        this.pending.delete(key);
      };
      void result.then(clear, clear);
    }
    return result;
  }
}
