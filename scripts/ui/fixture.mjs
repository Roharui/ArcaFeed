import $ from 'jquery';
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

function notify(message) {
  $('#fixture-event').text(message);
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
      channelId: mode === 'home' ? 'my' : 'test0',
      articleId: '100',
    },
    isSeriesMode: mode === 'series' || mode === 'feed',
    isScrapMode: mode === 'scrap',
    seriesChannels: mode === 'feed' ? ['test0', 'test1'] : [],
    articleKey: 'ui-preview',
    articleList: ['/b/test0/100'],
    activeIndex: 0,
    articleFilterConfig: {
      test0: {
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
  };
}

function render(options = scenario) {
  if (vault) initCloseModal(vault);
  scenario = normalizeScenario(options);
  savedCount = 0;
  const data = createFixtureData(scenario);
  document.body.dataset.theme = scenario.theme;
  $('.board-category')
    .empty()
    .append(data.categories.map((text) => $('<span>', { text })));
  $('.my-subscribe-channels')
    .empty()
    .append(
      data.channels.map((channel) =>
        $('<a>', {
          class: 'channel',
          href: `/b/${channel.id}`,
          text: channel.name,
        }),
      ),
    );
  vault = makeVault(data);
  notify('테스트 데이터가 준비됐습니다.');
  initModal(vault);
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
$('#reopen').on('click', () => initModal(vault));

// Keep navigation inside the preview; layout and setting handlers remain real.
document.addEventListener(
  'click',
  (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest('a, .arcafeed-resume-action')
        : null;
    if (!target || target.closest('.my-subscribe-channels')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    notify(`테스트 화면에서 이동 생략: ${target.textContent.trim()}`);
  },
  true,
);

window.uiFixture = {
  render,
  get scenario() {
    return { ...scenario };
  },
  get vault() {
    return vault;
  },
  get buildHash() {
    return document.querySelector('meta[name="arcafeed-build"]').content;
  },
};
render(Object.fromEntries(new URLSearchParams(location.search)));
