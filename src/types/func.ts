import type { Vault } from '@/vault';

type PromiseFunc = (v: Vault) => Promise<Vault> | Vault;

export type { PromiseFunc };
