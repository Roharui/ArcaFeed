import { createVersionInfo } from '@feed/core/feature/version';
import { getStorage } from '@/vault/indexed-storage';
import { navigate } from '@/feature/navigation';
import type { VaultAdapter } from '@/vault';

export const addVersionInfo = createVersionInfo<VaultAdapter>({
  appName: 'RuliFeed',
  getEnv: () =>
    process.env.NODE_ENV === 'development'
      ? {
          nodeEnv: process.env.NODE_ENV,
          gitHash: process.env.GIT_HASH,
          buildDate: process.env.BUILD_DATE,
          device: process.env.DEVICE,
          versionReload: process.env.VERSION_RELOAD,
        }
      : { nodeEnv: process.env.NODE_ENV },
  getStorage,
  navigate,
});
