/**
 * ArcaFeed Scrap Plugin — Core Logic
 *
 * Provides "Scrap Series" button on scrap list pages.
 * Exported for use in both standalone and bundled builds.
 */

// ── DOM Building ───────────────────────────────────────

function createArcaFeedBtn(
  id: string,
  icon: string,
  callback: () => void,
  display = 'list-item',
): HTMLElement {
  const li = document.createElement('li');
  li.className = `nav-item dropdown userscript-nav-item ${id}`;
  li.style.display = display;
  li.innerHTML = `
    <a class="nav-link">
      <span class="d-none d-sm-inline navbar-top-margin"></span>
      <span class="${icon} h5"></span>
    </a>`;
  li.addEventListener('click', () => callback());
  return li;
}

function btnWrapper(btns: HTMLElement[]): HTMLElement {
  const ul = document.createElement('ul');
  ul.className = 'nav navbar-nav userscript-nav';
  btns.forEach((b) => ul.appendChild(b));
  return ul;
}

// ── Helpers ────────────────────────────────────────────

function isPluginEnabled(): boolean {
  try {
    const raw = localStorage.getItem('arcaFeed:pluginSettings');
    if (!raw) return true;
    const settings = JSON.parse(raw);
    return settings.scrap !== false;
  } catch {
    return true;
  }
}

function register(): void {
  const bridge = (window as any).__arcaFeed;
  if (!bridge) return;
  if (!bridge.plugins) bridge.plugins = [];
  bridge.plugins.push({
    id: 'scrap',
    name: '스크랩 시리즈',
    description: '스크랩 목록 페이지에서 스크랩 시리즈 모드 버튼을 제공합니다.',
  });
}

// ── Main Logic ─────────────────────────────────────────

function buildScrapButtons(p?: { isSeriesMode?: boolean }): void {
  if (p?.isSeriesMode) return;

  const navbarList = document.querySelectorAll('ul.nav.navbar-nav');
  if (navbarList.length === 0) return;

  const lastNav = navbarList[navbarList.length - 1];
  lastNav.before(
    btnWrapper([
      createArcaFeedBtn('series', 'ion-ios-albums', () => {
        const bus = (window as any).__arcaFeed?.eventBus;
        if (bus) bus.emit('enableScrapSeries');
      }),
    ]),
  );
}

// ── Page Mode Detection ────────────────────────────────

export function isScrapPage(): boolean {
  return /\/u\/scrap_list/.test(window.location.pathname);
}

// ── Plugin Init ────────────────────────────────────────

export function initScrapPlugin(): void {
  register();

  if (!isPluginEnabled()) {
    console.log('[Scrap Plugin] Disabled, skipping.');
    return;
  }

  if (!isScrapPage()) {
    console.log('[Scrap Plugin] Not a scrap page, skipping.');
    return;
  }

  console.log('[Scrap Plugin] Loaded!');

  const bridge = (window as any).__arcaFeed;
  if (bridge) {
    bridge.pluginSteps = bridge.pluginSteps || [];
    bridge.pluginSteps.push((p: any) => {
      console.log('[Scrap Plugin] Rendering scrap series button.');
      buildScrapButtons(p);
    });
  } else {
    console.warn('[Scrap Plugin] ArcaFeed bridge not available.');
  }
}
