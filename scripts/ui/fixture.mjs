import {
  IndexedStorage,
  initializeStorage,
  getStorage,
  flushStorage,
} from '@/vault/indexed-storage';
import { VaultAdapter } from '@/vault';
import { Store } from '@/vault/store';
import { initReading } from '@/feature/reading';
import { StorageRepository } from '@/vault/repository';
import { ReadingHistory } from '@/vault/reading-history';
import { createElement } from '@/utils/dom';
import { showFetchLoader, hideFetchLoader } from '@/feature/article/loading';
import { initNavigationList } from '@/feature/modal/navigationTab';
import './fixture.css';
import { createInitialState } from '@/vault/store';
import { eventBus } from '@/core/app-events';
import {
  initModal,
  initCloseModal,
  initCheckFilterModal,
  initCheckUIModal,
  initCheckSubscribeModal,
} from '@/feature/modal';
import { createFixtureData, normalizeScenario } from './fixtures.mjs';

const nativeFetch = window.fetch.bind(window);
let scenario;
let vault;
let savedCount = 0;
let cleanupNavigation;

function notify(message) {
  document.querySelector('#fixture-event').textContent = message;
}

// Isolate only channel requests; status checks and other local assets use real fetch.
window.fetch = async (input, options) => {
  const url = new URL(
    typeof input === 'string' ? input : input.url,
    location.href,
  );
  if (!/^\/b\/test\d+$/.test(url.pathname)) return nativeFetch(input, options);
  const requestScenario = { ...scenario };
  if (requestScenario.network === 'slow') {
    await new Promise((resolve, reject) => {
      const done = () => {
        options?.signal?.removeEventListener('abort', abort);
        resolve();
      };
      const timer = setTimeout(done, 1500);
      const abort = () => {
        clearTimeout(timer);
        reject(options.signal.reason);
      };
      if (options?.signal?.aborted) abort();
      else options?.signal?.addEventListener('abort', abort, { once: true });
    });
  }
  if (requestScenario.network === 'error')
    return new Response('Fixture fetch failure', { status: 503 });
  const { categories } = createFixtureData(requestScenario);
  return new Response(
    `<div class="board-category">${categories.map((text) => `<span>${text}</span>`).join('')}</div>`,
  );
};

function makeVault(data) {
  const listeners = new Set();
  const reading = {
    entries: data.entries,
    sessions: data.sessions,
    reload() {
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    removeSession(id) {
      this.sessions = this.sessions.filter((session) => session.id !== id);
      this.reload();
    },
    hasVisited: () => false,
    getVisitedPaths: () => new Set(),
  };
  const mode = data.scenario.mode;
  const initial = createInitialState();
  return {
    ...initial,
    href: {
      ...initial.href,
      mode: mode === 'home' ? 'HOME' : mode === 'scrap' ? 'SCRAP' : 'CHANNEL',
      channelId: mode === 'home' ? 'my' : 'community/board/300152',
      articleId: '100',
    },
    isSeriesMode: mode === 'series' || mode === 'feed',
    isScrapMode: mode === 'scrap',
    seriesChannels:
      mode === 'feed'
        ? ['community/board/300152', 'community/board/300153']
        : [],
    articleKey: 'ui-preview',
    articleList: data.entries.map((entry) => entry.path),
    activeIndex: 0,
    articleFilterConfig: {
      'community/board/300152': {
        tab: [],
        title: data.keywords,
        onlyBest: false,
        disableSwiper: false,
      },
    },
    uiSettings: { ...initial.uiSettings, lastModalTab: data.scenario.tab },
    reading,
    skipVisitedArticles: false,
    flushSave() {
      savedCount++;
      notify(`설정 저장 ${savedCount}회`);
    },
    updateState(patch) {
      Object.assign(this, patch);
    },
    isCurrentMode(...modes) {
      return modes.includes(this.href.mode);
    },
    isNextPageActive: () => true,
    getState() {
      return this;
    },
    subscribe() {
      return () => {};
    },
  };
}

function render(options = scenario) {
  cleanupNavigation?.();
  if (vault) initCloseModal(vault);
  scenario = normalizeScenario(options);
  savedCount = 0;
  const data = createFixtureData(scenario);
  document.body.dataset.theme = scenario.theme;
  document
    .querySelector('.category_list')
    .replaceChildren(
      ...data.categories.map((text) => createElement('a', { text })),
    );
  document.querySelector('#nav_favorite').replaceChildren(
    ...data.channels.map((channel) =>
      createElement('a', {
        class: 'channel',
        href: `/${channel.id}`,
        text: channel.name,
      }),
    ),
  );
  vault = makeVault(data);
  notify('테스트 데이터가 준비됐습니다.');
  initModal(vault);
  cleanupNavigation = initNavigationList(vault);
  return scenario;
}

eventBus.on('closeModal', () => initCloseModal(vault));
eventBus.on('checkUIModal', () => {
  initCheckUIModal(vault);
  initCloseModal(vault);
});
eventBus.on('checkFilterModal', () => {
  initCheckFilterModal(vault);
  vault.flushSave();
  initCloseModal(vault);
});
eventBus.on('checkSubscribeModal', () => {
  initCheckSubscribeModal(vault);
  vault.flushSave();
  initCloseModal(vault);
});
const reopen = document.querySelector('#reopen');
reopen.addEventListener('click', () => initModal(vault));

// Keep navigation inside the preview; layout and setting handlers remain real.
document.addEventListener(
  'click',
  (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest('a, .rulifeed-resume-action')
        : null;
    if (
      !target ||
      target.closest('#nav_favorite, .rulifeed-navigation-control')
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    notify(`테스트 화면에서 이동 생략: ${target.textContent.trim()}`);
  },
  true,
);

window.uiFixture = {
  showFetchLoader,
  hideFetchLoader,
  render,
  get scenario() {
    return { ...scenario };
  },
  get vault() {
    return vault;
  },
  get buildHash() {
    return document.querySelector('meta[name="rulifeed-build"]').content;
  },
};
render(Object.fromEntries(new URLSearchParams(location.search)));

// Local browser verification of the real storage modules; excluded from userscript builds.
window.storageFixture = {
  IndexedStorage,
  StorageRepository,
  ReadingHistory,
  initializeStorage,
  getStorage,
  flushStorage,
  VaultAdapter,
  Store,
  initReading,
};
