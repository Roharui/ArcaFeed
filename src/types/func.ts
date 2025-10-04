import type { Vault } from '@/vault';

type PromiseFunc = (v?: Vault) => Promise<Vault | void> | Vault | void;

export type { PromiseFunc };
