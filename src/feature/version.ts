import $ from 'jquery';

import type { Vault } from '@/vault';

function addVersionInfo(_: Vault): void {
  if (process.env.NODE_ENV !== 'development') return;

  const version = process.env.GIT_HASH || 'unknown';
  const date = process.env.BUILD_DATE || 'unknown';

  const versionInfo = `ArcaFeed Version: ${version} (Build Date: ${date})`;

  if (process.env.DEVICE === 'mobile') {
    if (localStorage.getItem('arca_version_info') !== versionInfo)
      window.location.reload();

    localStorage.setItem('arca_version_info', versionInfo);
  }

  $('footer').append(
    $('<div>', {
      text: versionInfo,
      style:
        'font-size: 12px; color: var(--color-text); margin-bottom: 10px; background-color: var(--color-bd-inner); padding: 5px;',
    }),
  );

  return;
}

export { addVersionInfo };
