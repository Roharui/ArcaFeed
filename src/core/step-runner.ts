import { StepRunner as CoreStepRunner } from '@feed/core/core/step-runner';
import type { Step as CoreStep } from '@feed/core/core/step-runner';
import { flushStorage } from '@/vault/indexed-storage';
import type { VaultAdapter } from '@/vault';

export type Step = CoreStep<VaultAdapter>;

export class StepRunner extends CoreStepRunner<VaultAdapter> {
  constructor() {
    super(flushStorage);
  }
}
