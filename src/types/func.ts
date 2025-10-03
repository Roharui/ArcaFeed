import type { Vault } from '@/vault';

type PromiseFunc = (v?: Vault) => Promise<Vault> | Vault | void;

export type { PromiseFunc };
