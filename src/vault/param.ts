import type { Config, VaultWithSwiper } from '@/vault';
import type { Vault } from '@/vault';

type Param = {
  v: Vault | VaultWithSwiper;
  c: Config;
};

export type { Param };
