import type { VaultAdapter } from '@/vault';

type PromiseFunc = (p: VaultAdapter) => void | Promise<void>;

export type { PromiseFunc };
