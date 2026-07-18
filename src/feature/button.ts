import $ from 'jquery';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

// ── Mode-specific button builders ───────────────────────

function buildChannelArticleButtons(p: VaultAdapter): void {
  const btns: JQuery<HTMLElement>[] = [];

  if (!p.isSeriesMode) {
    const { disableSwiper } = p.articleFilterConfig[p.href.channelId] || {
      disableSwiper: false,
    };
    btns.push(
      createArcaFeedBtn(
        'next',
        disableSwiper ? 'ion-ios-locked' : 'ion-ios-arrow-forward',
        () => eventBus.emit('toggleSwiper'),
      ),
    );
  }

  btns.push(
    createArcaFeedBtn('filter', 'ion-ios-gear', () =>
      eventBus.emit('showModal'),
    ),
  );

  $('ul.nav.navbar-nav').last().before(btnWrapper(btns));
}

function buildHomeButtons(_p: VaultAdapter): void {
  const btns: JQuery<HTMLElement>[] = [
    createArcaFeedBtn('filter', 'ion-ios-gear', () =>
      eventBus.emit('showModal'),
    ),
  ];

  $('ul.nav.navbar-nav').last().before(btnWrapper(btns));
}

const BUTTON_BUILDERS: Record<string, (p: VaultAdapter) => void> = {
  HOME: buildHomeButtons,
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
    $(`<li class="nav-item dropdown userscript-nav-item ${id}" style="display: ${display};">
  <a class="nav-link">
    <span class="d-none d-sm-inline navbar-top-margin"></span>
    <span class="${icon} h5"></span>
  </a>
  </li>`);

  btn.on('click', () => callback());

  return btn;
}

function btnWrapper(btn: JQuery<HTMLElement>[]): JQuery<HTMLElement> {
  const ul = $('<ul>', { class: 'nav navbar-nav userscript-nav' });
  btn.forEach((b) => ul.append(b));
  return ul;
}

export { initButton };
