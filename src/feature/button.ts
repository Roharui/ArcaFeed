import $ from 'jquery';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

// ── Mode-specific button builders ───────────────────────

function buildHomeButtons(_p: VaultAdapter): void {
  $('ul.nav.navbar-nav')
    .last()
    .before(
      btnWrapper([
        createArcaFeedBtn(
          'filter',
          'ion-ios-gear',
          () => void eventBus.emit('showModal'),
        ),
      ]),
    );
}

function buildScrapButtons(p: VaultAdapter): void {
  if (p.isSeriesMode) return;

  $('ul.nav.navbar-nav')
    .last()
    .before(
      btnWrapper([
        createArcaFeedBtn(
          'series',
          'ion-ios-albums',
          () => void eventBus.emit('enableScrapSeries'),
        ),
      ]),
    );
}

function buildChannelArticleButtons(p: VaultAdapter): void {
  const btns: JQuery<HTMLElement>[] = [];

  if (!p.isSeriesMode) {
    const { disableSwiper } = p.articleFilterConfig[p.href.channelId] || {
      disableSwiper: false,
      onlyBest: false,
    };
    const $toggle = createArcaFeedBtn(
      'next',
      disableSwiper ? 'ion-ios-locked' : 'ion-ios-arrow-forward',
      () => void eventBus.emit('toggleSwiper'),
    );
    $toggle.find('button').attr('aria-pressed', (!disableSwiper).toString());
    btns.push($toggle);
  }

  btns.push(
    createArcaFeedBtn(
      'filter',
      'ion-ios-gear',
      () => void eventBus.emit('showModal'),
    ),
  );

  $('ul.nav.navbar-nav').last().before(btnWrapper(btns));
}

const BUTTON_BUILDERS: Record<string, (p: VaultAdapter) => void> = {
  HOME: buildHomeButtons,
  SCRAP: buildScrapButtons,
  CHANNEL: buildChannelArticleButtons,
  ARTICLE: buildChannelArticleButtons,
};

const initButton = (p: VaultAdapter) => {
  // Keep initialization idempotent when a page pipeline is re-run.
  $('ul.userscript-nav').remove();
  BUTTON_BUILDERS[p.href.mode]?.(p);
};

// ── Helpers ─────────────────────────────────────────────

function createArcaFeedBtn(
  id: string,
  icon: string,
  callback: () => void,
  display = 'list-item',
) {
  const accessibleNames: Record<string, string> = {
    filter: 'ArcaFeed 설정 열기',
    next: 'Swiper 활성화 상태 전환',
    series: '스크랩 시리즈 시작',
  };
  const accessibleName = accessibleNames[id] ?? 'ArcaFeed 동작 실행';
  const $button = $('<button>', {
    type: 'button',
    class: 'nav-link arcafeed-nav-button',
    'aria-label': accessibleName,
    title: accessibleName,
  })
    .append(
      $('<span>', {
        class: 'd-none d-sm-inline navbar-top-margin',
        'aria-hidden': 'true',
      }),
    )
    .append(
      $('<span>', {
        class: `${icon} h5`,
        'aria-hidden': 'true',
      }),
    )
    .on('click.arcafeed-button', () => callback());

  const $item = $('<li>', {
    class: `nav-item dropdown userscript-nav-item ${id}`,
    css: { display },
  }).append($button);

  return $item;
}

function btnWrapper(btn: JQuery<HTMLElement>[]): JQuery<HTMLElement> {
  const ul = $('<ul>', { class: 'nav navbar-nav userscript-nav' });
  btn.forEach((b) => ul.append(b));
  return ul;
}

export { initButton };
