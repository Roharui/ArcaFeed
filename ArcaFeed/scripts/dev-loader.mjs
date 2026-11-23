import { getDevHeaders } from '../../webpack.config.js';

// This function runs inside the userscript manager, alongside the @require globals.
function liveLoader(baseURL) {
  baseURL = baseURL.replace(/\/+$/, '');
  let currentHash = null;
  let reportedFailure = false;

  function retry(error) {
    if (!reportedFailure) {
      console.warn('[ArcaFeed live] 개발 서버 연결 대기 중:', error);
      reportedFailure = true;
    }
    setTimeout(poll, 1000);
  }

  function poll() {
    const url = `${baseURL}/build?hash=${currentHash || ''}&t=${Date.now()}`;
    const callbacks = {
      onload(response) {
        let build;
        try {
          if (response.status !== 200)
            throw new Error(`HTTP ${response.status}`);
          build = JSON.parse(response.responseText);
        } catch (error) {
          retry(error);
          return;
        }
        reportedFailure = false;
        if (build.hash && currentHash && build.hash !== currentHash) {
          window.location.reload();
          return;
        }
        if (build.hash && !currentHash) {
          currentHash = build.hash;
          try {
            // Direct eval preserves access to Swiper and Toastify from @require.
            eval(build.code);
            console.info('[ArcaFeed live] 최신 개발 빌드 로드:', currentHash);
          } catch (error) {
            console.error('[ArcaFeed live] 실행 오류:', error);
          }
        }
        setTimeout(poll, 1000);
      },
      onerror: retry,
      ontimeout: retry,
    };
    try {
      GM_xmlhttpRequest({ method: 'GET', url, timeout: 5000, ...callbacks });
    } catch (error) {
      retry(error);
    }
  }

  poll();
}

export function normalizeDevURL(baseURL) {
  const url = new URL(baseURL);
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

export function createDevLoader(baseURL) {
  if (baseURL) baseURL = normalizeDevURL(baseURL);
  const headers = {
    ...getDevHeaders('arcafeed', '1.0.0'),
    name: 'ArcaFeed-live',
    description: 'Load local ArcaFeed builds and reload on changes',
    grant: 'GM_xmlhttpRequest',
    connect: new URL(baseURL).hostname,
    noframes: '',
  };
  const metadata = Object.entries(headers).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value]).map((entry) =>
      `// @${key} ${entry}`.trimEnd(),
    ),
  );
  return [
    '// ==UserScript==',
    ...metadata,
    '// ==/UserScript==',
    `(${liveLoader.toString()})(${JSON.stringify(baseURL)});`,
    '',
  ].join('\n');
}
