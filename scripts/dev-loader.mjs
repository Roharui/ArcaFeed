import { getDevHeaders } from '../webpack.config.dev.js';

// This function runs inside the userscript manager, alongside the @require globals.
function liveLoader(baseURL, transport) {
  baseURL = baseURL.replace(/\/+$/, '');
  let currentHash = null;
  let reportedFailure = false;
  const useGM =
    transport !== 'fetch' && typeof GM_xmlhttpRequest === 'function';

  if (!useGM && !baseURL.startsWith('https://')) {
    console.error(
      '[ArcaFeed live] GM API 없이 로드하려면 HTTPS 주소가 필요합니다. DEV_URL을 HTTPS 주소로 지정하고 fetch 로더를 다시 설치하세요.',
    );
    return;
  }

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
            // Direct eval preserves access to jQuery, Swiper and Toastify from @require.
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
      if (useGM) {
        GM_xmlhttpRequest({ method: 'GET', url, timeout: 5000, ...callbacks });
      } else {
        fetch(url, {
          cache: 'no-store',
          credentials: 'omit',
          signal: AbortSignal.timeout(5000),
        })
          .then(async (response) => ({
            status: response.status,
            responseText: await response.text(),
          }))
          .then(callbacks.onload, callbacks.onerror);
      }
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

export function createDevLoader(
  baseURL,
  device = 'desktop',
  transport = 'auto',
) {
  if (baseURL) baseURL = normalizeDevURL(baseURL);
  const headers = {
    ...getDevHeaders(device, '1.0.0'),
    name: transport === 'fetch' ? 'ArcaFeed-live-fetch' : 'ArcaFeed-live',
    description: 'Load local ArcaFeed builds and reload on changes',
    grant: transport === 'fetch' ? 'none' : 'GM_xmlhttpRequest',
    ...(transport === 'fetch' ? {} : { connect: new URL(baseURL).hostname }),
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
    `(${liveLoader.toString()})(${JSON.stringify(baseURL)}, ${JSON.stringify(transport)});`,
    '',
  ].join('\n');
}
