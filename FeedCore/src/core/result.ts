/** Completion and success are separate; even ignored failures resolve explicitly. */
export type CommandResult =
  | { ok: true }
  | { ok: false; errors: readonly unknown[] };

export function failedCommand(error: unknown): CommandResult {
  return { ok: false, errors: [error] };
}
