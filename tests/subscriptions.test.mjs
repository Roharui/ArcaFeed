import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture } from './dom-fixture.mjs';
import { memoryStorage, sourceLoader } from './source-loader.mjs';

test('Ruliweb routes recognize mobile and desktop boards and reject external hosts', () => {
  const { parseHref } = sourceLoader({ globals: { console: { log() {} } } })(
    'src/utils/regex.ts',
  );
  for (const path of ['/', '/?page=2', '/#top'])
    assert.equal(parseHref(`https://bbs.ruliweb.com${path}`).mode, 'HOME');
  assert.equal(
    parseHref('https://bbs.ruliweb.com/community/board/300143/read/123').mode,
    'ARTICLE',
  );
  assert.equal(
    parseHref('https://bbs.ruliweb.com/community/board/300143').mode,
    'CHANNEL',
  );
  assert.deepEqual(
    parseHref(
      'https://m.ruliweb.com/game/board/123/read/456/?page=2&articleKey=active#cmt',
    ),
    {
      mode: 'ARTICLE',
      channelId: 'game/board/123',
      articleId: '456',
      articleKey: 'active',
      search: '?page=2&articleKey=active',
    },
  );
  for (const host of [
    'arca.live',
    'example.com',
    'm.ruliweb.com.example.com',
  ]) {
    assert.equal(
      parseHref(`https://${host}/game/board/123/read/456`).mode,
      'OTHER',
    );
  }
  assert.equal(
    parseHref('https://m.ruliweb.com/game/board/123/write').mode,
    'OTHER',
  );
});

test('articleKey stays in history.state and sessionStorage without polluting URLs', () => {
  const session = memoryStorage();
  const location = {
    origin: 'https://m.ruliweb.com',
    href: 'https://m.ruliweb.com/community/board/300143',
  };
  const history = {
    state: { site: true },
    replaceState(state, _title, url) {
      this.state = state;
      if (typeof url === 'string') location.href = url;
    },
  };
  const { ensureTabArticleKey, getCurrentArticleKey } = sourceLoader({
    globals: {
      sessionStorage: session,
      window: { location, history },
    },
  })('src/utils/article-key.ts');

  const firstKey = ensureTabArticleKey();
  assert.ok(firstKey);
  assert.equal(location.href, 'https://m.ruliweb.com/community/board/300143');
  assert.equal(history.state.site, true);
  assert.equal(history.state.ruliFeedArticleKey, firstKey);
  assert.equal(getCurrentArticleKey(), firstKey);

  // Moving from board list to article in the same tab inherits the key via sessionStorage.
  location.href = 'https://m.ruliweb.com/community/board/300143/read/100';
  history.state = null;
  assert.equal(ensureTabArticleKey(), firstKey);
  assert.equal(
    location.href,
    'https://m.ruliweb.com/community/board/300143/read/100',
  );
  assert.equal(history.state.ruliFeedArticleKey, firstKey);

  // Opening a fresh channel listing in the same tab creates a separate key.
  location.href = 'https://m.ruliweb.com/ps/board/300001';
  history.state = null;
  const secondKey = ensureTabArticleKey();
  assert.ok(secondKey);
  assert.notEqual(secondKey, firstKey);
  assert.equal(location.href, 'https://m.ruliweb.com/ps/board/300001');

  // Back navigation restores the previous session key from history.state.
  location.href = 'https://m.ruliweb.com/community/board/300143/read/100';
  history.state = { ruliFeedArticleKey: firstKey };
  assert.equal(ensureTabArticleKey(), firstKey);

  // Explicit URL handoff (e.g. series new tab) is absorbed and stripped from the URL.
  location.href =
    'https://m.ruliweb.com/community/board/300143/read/100?articleKey=handoff&cate=13';
  history.state = null;
  assert.equal(ensureTabArticleKey(), 'handoff');
  assert.equal(
    location.href,
    'https://m.ruliweb.com/community/board/300143/read/100?cate=13',
  );
  assert.equal(history.state.ruliFeedArticleKey, 'handoff');
});

test('a channel filter reads only its own editor and preserves its navigation setting', () => {
  const { readArticleFilter } = sourceLoader()('src/feature/modal/filterUi.ts');
  const editor = (tab, title, onlyBest) => {
    const { document } = domFixture(`
      <input id="filter-best-checkbox" type="checkbox">
      ${tab.map((value) => `<input class="ele-category" type="checkbox" value="${value}" checked>`).join('')}
      ${title.map((text) => `<button class="exclude-title-tag" data-text="${text}"></button>`).join('')}
    `);
    document.querySelector('#filter-best-checkbox').checked = onlyBest;
    return document;
  };
  assert.deepEqual(
    readArticleFilter(
      editor(['정보'], ['차단'], true),
      { disableSwiper: true },
      '첫 번째',
    ),
    {
      tab: [],
      title: ['차단'],
      onlyBest: true,
      disableSwiper: true,
      channelName: '첫 번째',
    },
  );
  assert.deepEqual(
    readArticleFilter(editor([], [], false), undefined, '두 번째'),
    {
      tab: [],
      title: [],
      onlyBest: false,
      disableSwiper: false,
      channelName: '두 번째',
    },
  );
});

test('saved category selections do not restrict title filtering', () => {
  const { buildFilterPredicate } = sourceLoader()('src/feature/filter.ts');
  const predicate = buildFilterPredicate({
    tab: ['이전 카테고리'],
    title: ['차단'],
    includeTitle: ['허용'],
  });
  assert.equal(predicate({ textContent: '허용 글' }), true);
  assert.equal(predicate({ textContent: '허용 차단 글' }), false);
  assert.equal(predicate({ textContent: '다른 글' }), false);
});

test('best-only request URLs retain the channel path, cursor and existing search parameters', () => {
  const { withBestMode } = sourceLoader({
    mocks: { '@/utils/toast': {} },
  })('src/feature/article/fetch.ts');
  for (const [url, expected] of [
    ['/community/board/300145', '/community/board/300145?view_best=1'],
    [
      '/community/board/300145/read/99?p=2',
      '/community/board/300145/read/99?p=2&view_best=1',
    ],
    ['99?articleKey=session', '99?articleKey=session&view_best=1'],
    ['?p=2&view_best=0', '?p=2&view_best=1'],
    [
      'https://bbs.ruliweb.com/community/board/300145?p=2#list',
      'https://bbs.ruliweb.com/community/board/300145?p=2&view_best=1#list',
    ],
  ]) {
    assert.equal(withBestMode(url, { onlyBest: true }), expected);
    assert.equal(withBestMode(url, { onlyBest: false }), url);
    assert.equal(withBestMode(url), url);
  }
});

test('Ruliweb list parsing uses the gallery title link and skips notices and related-board promos', () => {
  const { extractLinks } = sourceLoader()('src/feature/article/listing.ts');
  const { document } = domFixture(`
    <div id="board_list">
      <table class="board_list_table"><tbody>
        <tr class="table_body notice"><td><a class="subject_link" href="/community/board/300143/read/1">공지</a></td></tr>
        <tr class="table_body other"><td><a class="subject_link" href="/game/board/123/read/2">다른 게시판</a></td></tr>
        <tr class="table_body gallery"><td>
          <a href="/community/board/300143/read/3?view=gallery"><div class="thumbnail"></div></a>
          <a href="https://m.ruliweb.com/community/board/300143/read/3?view=gallery"><span class="subject_link">갤러리 글</span></a>
        </td></tr>
      </tbody></table>
    </div>
  `);
  assert.deepEqual(extractLinks(document), ['/community/board/300143/read/3']);
});
