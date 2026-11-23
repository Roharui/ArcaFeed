import { createElement } from '../utils/dom';
import type { RecordCache } from '../vault/record-schema';

export interface VersionEnv {
  nodeEnv?: string | undefined;
  gitHash?: string | undefined;
  buildDate?: string | undefined;
  device?: string | undefined;
  versionReload?: string | undefined;
}

export interface CreateVersionInfoOptions<TVault> {
  appName: string;
  getEnv: () => VersionEnv;
  getStorage: () => RecordCache;
  navigate: (
    p: TVault,
    move: () => void,
    options?: { prepare?: () => void | Promise<void> },
  ) => Promise<boolean>;
}

export function createVersionInfo<TVault>({
  appName,
  getEnv,
  getStorage,
  navigate,
}: CreateVersionInfoOptions<TVault>): (p: TVault) => Promise<void> {
  return async function addVersionInfo(p: TVault): Promise<void> {
    const env = getEnv();
    if (env.nodeEnv !== 'development') return;

    const version = env.gitHash || 'unknown';
    const date = env.buildDate || 'unknown';

    const versionInfo = `${appName} Version: ${version} (Build Date: ${date})`;

    if (env.device === 'mobile' && env.versionReload !== 'false') {
      if (getStorage().get('settings', 'versionInfo')?.value !== versionInfo)
        await navigate(p, () => window.location.reload(), {
          prepare: () =>
            getStorage().set('settings', 'versionInfo', {
              id: 'versionInfo',
              value: versionInfo,
            }),
        });
    }

    document.querySelectorAll('footer').forEach((footer) =>
      footer.append(
        createElement('div', {
          text: versionInfo,
          style:
            'font-size: 12px; color: var(--color-text); margin-bottom: 10px; background-color: var(--color-bd-inner); padding: 5px;',
        }),
      ),
    );
  };
}
