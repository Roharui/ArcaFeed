import { getStorage } from '@/vault/indexed-storage';
import $ from 'jquery';
import { navigate } from '@/feature/navigation';

import type { VaultAdapter } from '@/vault';

async function addVersionInfo(p: VaultAdapter): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;

  const version = process.env.GIT_HASH || 'unknown';
  const date = process.env.BUILD_DATE || 'unknown';

  const versionInfo = `ArcaFeed Version: ${version} (Build Date: ${date})`;

  if (
    process.env.DEVICE === 'mobile' &&
    process.env.VERSION_RELOAD !== 'false'
  ) {
    if (getStorage().get('settings', 'versionInfo')?.value !== versionInfo)
      await navigate(p, () => window.location.reload(), {
        prepare: () =>
          getStorage().set('settings', 'versionInfo', {
            id: 'versionInfo',
            value: versionInfo,
          }),
      });
  }

  $('footer').append(
    $('<div>', {
      text: versionInfo,
      style:
        'font-size: 12px; color: var(--color-text); margin-bottom: 10px; background-color: var(--color-bd-inner); padding: 5px;',
    }),
  );
}

export { addVersionInfo };
