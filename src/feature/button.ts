import { createElement, fromTemplate, setAttributes } from '@/utils/dom';

import { eventBus } from '@/core/app-events';

import type { VaultAdapter } from '@/vault';

// ── Mode-specific button builders ───────────────────────

function buildHomeButtons(_p: VaultAdapter): void {
  lastNavbarList()?.before(
    btnWrapper([
      createArcaFeedBtn('filter', 'bi-gear-fill', () =>
        eventBus.emit('showModal'),
      ),
    ]),
  );
}

function buildScrapButtons(p: VaultAdapter): void {
  if (p.isSeriesMode) return;

  const shuffleIcon = p.isShuffleMode ? 'bi-shuffle' : 'bi-arrow-down-up';

  lastNavbarList()?.before(
    btnWrapper([
      createArcaFeedBtn('shuffle', shuffleIcon, () =>
        eventBus.emit('toggleShuffle'),
      ),
      createArcaFeedBtn('series', 'bi-archive-fill', () =>
        eventBus.emit('enableScrapSeries'),
      ),
      createArcaFeedBtn('filter', 'bi-gear-fill', () =>
        eventBus.emit('showModal'),
      ),
    ]),
  );
}

function buildChannelArticleButtons(p: VaultAdapter): void {
  const btns: HTMLElement[] = [];

  if (!p.isSeriesMode) {
    const { disableSwiper } = p.articleFilterConfig[p.href.channelId] || {
      disableSwiper: false,
      onlyBest: false,
    };
    btns.push(
      createArcaFeedBtn(
        'next',
        disableSwiper ? 'bi-lock-fill' : 'bi-forward-fill',
        () => eventBus.emit('toggleSwiper'),
      ),
    );
  }

  btns.push(
    createArcaFeedBtn('filter', 'bi-gear-fill', () =>
      eventBus.emit('showModal'),
    ),
  );

  lastNavbarList()?.before(btnWrapper(btns));
}

const BUTTON_BUILDERS: Record<string, (p: VaultAdapter) => void> = {
  HOME: buildHomeButtons,
  SCRAP: buildScrapButtons,
  CHANNEL: buildChannelArticleButtons,
  ARTICLE: buildChannelArticleButtons,
};

const initButton = (p: VaultAdapter) => {
  BUTTON_BUILDERS[p.href.mode]?.(p);
};

// ── Helpers ─────────────────────────────────────────────

function createArcaFeedBtn(
  id: string,
  icon: string,
  callback: () => void,
  display = 'list-item',
) {
  const btn =
    fromTemplate(`<li class="nav-item dropdown userscript-nav-item ${id}" style="display: ${display};">
  <a class="nav-link">
    <span class="d-none d-sm-inline navbar-top-margin"></span>
    <span class="${icon} h5"></span>
  </a>
  </li>`);

  const labels: Record<string, string> = {
    filter: '아카피드 설정',
    next: '스와이프 모드 전환',
    shuffle: '스크랩 순서 전환',
    series: '스크랩 탐색 시작',
  };
  const link = btn.querySelector('a')!;
  setAttributes(link, {
    role: 'button',
    tabindex: 0,
    'aria-label': labels[id] || id,
  });
  link.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      void callback();
    }
  });
  btn.addEventListener('click', () => callback());

  return btn;
}

function lastNavbarList(): HTMLUListElement | undefined {
  const lists =
    document.querySelectorAll<HTMLUListElement>('ul.nav.navbar-nav');
  return lists[lists.length - 1];
}

function btnWrapper(buttons: HTMLElement[]): HTMLUListElement {
  return createElement(
    'ul',
    { class: 'nav navbar-nav userscript-nav' },
    ...buttons,
  );
}

export { initButton };
