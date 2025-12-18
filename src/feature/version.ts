import $ from 'jquery';

import type { Param } from '@/vault';

function addVersionInfo(_: Param): void {
  if (process.env.NODE_ENV !== 'development') return;

  const version = process.env.GIT_HASH || 'unknown';
  const date = process.env.BUILD_DATE || 'unknown';

  const versionInfo = `ArcaFeed Version: ${version} (Build Date: ${date})`;

  $('body').prepend(
    $('<div>', {
      text: versionInfo,
      style:
        'font-size: 12px; color: var(--color-text); margin-bottom: 10px; background-color: var(--color-bd-inner); padding: 5px;',
    }),
  );

  return;
}

export { addVersionInfo };
