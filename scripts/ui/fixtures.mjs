export const MODES = ['channel', 'home', 'series', 'feed', 'scrap'];
export const SIZES = ['empty', 'short', 'long'];
export const NETWORKS = ['success', 'slow', 'error'];
export const THEMES = ['light', 'dark'];

export function normalizeScenario(options = {}) {
  const pick = (values, value, fallback) =>
    values.includes(value) ? value : fallback;
  return {
    mode: pick(MODES, options.mode, 'channel'),
    size: pick(SIZES, options.size, 'long'),
    network: pick(NETWORKS, options.network, 'success'),
    theme: pick(THEMES, options.theme, 'light'),
    tab: pick(
      ['filter', 'subscribe', 'ui', 'history', 'resume'],
      options.tab,
      'ui',
    ),
  };
}

export function createFixtureData(options = {}, now = Date.now()) {
  const scenario = normalizeScenario(options);
  const count =
    scenario.size === 'empty' ? 0 : scenario.size === 'short' ? 1 : 70;
  const channels = Array.from({ length: count }, (_, i) => ({
    id: `test${i}`,
    name: `테스트 채널 ${i} 긴 이름 테스트`,
  }));
  const entries = channels.map((channel, i) => ({
    path: `/b/${channel.id}/${100 + i}`,
    title: `레이아웃 검사 게시글 ${i} 긴 제목을 넣어 모바일 줄바꿈도 확인합니다.`,
    channelName: channel.name,
    visitedAt: now - i * 60000,
  }));
  const sessions = entries.slice(0, 20).map((entry, i) => ({
    id: `session${i}`,
    path: entry.path,
    label: channels[i].name,
    seriesChannels: i % 3 === 1 ? ['test0', 'test1'] : [],
    isSeriesMode: i % 3 === 1,
    isScrapMode: i % 3 === 2,
    updatedAt: entry.visitedAt,
    articleList: [entry.path],
    searchQuery: '',
    scrollY: 0,
  }));
  return {
    scenario,
    channels,
    entries,
    sessions,
    categories: Array.from(
      { length: scenario.size === 'long' ? 24 : 2 },
      (_, i) => `카테고리 ${i}`,
    ),
    keywords:
      scenario.size === 'long'
        ? Array.from({ length: 18 }, (_, i) => `차단 키워드 ${i}`)
        : [],
  };
}
