import type {
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  HomeSeriesState,
  SeriesSource,
  UISettings,
} from '@/types';

const MIN_CONTENT_WIDTH = 700;
const MAX_CONTENT_WIDTH = 1400;

const DEFAULT_ARTICLE_FILTER: Readonly<ArticleFilterImpl> = {
  tab: [],
  title: [],
  disableSwiper: false,
  onlyBest: false,
};

const DEFAULT_UI_SETTINGS: Readonly<UISettings> = {
  hideScrollbar: true,
  hideBlur: true,
  hideNavControl: false,
  hideArticleTitle: false,
  hideArticleAuthor: false,
  hideArticleTime: false,
  hideArticleView: false,
  lastModalTab: 'filter',
  hiddenChannels: [],
  contentWidth: 700,
};

const DEFAULT_HOME_SERIES_STATE: Readonly<HomeSeriesState> = {
  channels: [],
  cursors: {},
  exhaustedChannels: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function readLegacyHomeSeriesChannels(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return uniqueStrings(value.homeSeriesChannels);
}

function inferLegacyHomeSeriesState(
  articleList: readonly string[],
  channels: readonly string[],
): HomeSeriesState | null {
  const allowedChannels = new Set(channels);
  const observedChannels = new Set<string>();
  const cursors: Record<string, number> = {};

  for (const href of articleList) {
    let url: URL;
    let parts: string[];
    try {
      url = new URL(href, 'https://arca.live');
      parts = url.pathname.split('/').filter(Boolean);
    } catch {
      continue;
    }

    const [section, channelId, rawArticleId, ...rest] = parts;
    const articleId = Number(rawArticleId);
    if (
      (url.hostname !== 'arca.live' && !url.hostname.endsWith('.arca.live')) ||
      section !== 'b' ||
      !channelId ||
      rest.length > 0 ||
      !allowedChannels.has(channelId) ||
      !Number.isSafeInteger(articleId)
    ) {
      continue;
    }

    observedChannels.add(channelId);
    cursors[channelId] =
      cursors[channelId] === undefined
        ? articleId
        : Math.min(cursors[channelId], articleId);
  }

  if (observedChannels.size < 2) return null;
  return {
    channels: [...channels],
    cursors,
    exhaustedChannels: [],
  };
}

function createDefaultArticleFilter(): ArticleFilterImpl {
  return {
    ...DEFAULT_ARTICLE_FILTER,
    tab: [],
    title: [],
  };
}

function createDefaultUISettings(): UISettings {
  return {
    ...DEFAULT_UI_SETTINGS,
    hiddenChannels: [],
  };
}

function createDefaultHomeSeriesState(): HomeSeriesState {
  return {
    ...DEFAULT_HOME_SERIES_STATE,
    channels: [],
    cursors: {},
    exhaustedChannels: [],
  };
}

function normalizeArticleFilter(value: unknown): ArticleFilterImpl {
  const fallback = createDefaultArticleFilter();
  if (!isRecord(value)) return fallback;

  return {
    tab: uniqueStrings(value.tab),
    title: uniqueStrings(value.title),
    disableSwiper:
      typeof value.disableSwiper === 'boolean'
        ? value.disableSwiper
        : fallback.disableSwiper,
    onlyBest:
      typeof value.onlyBest === 'boolean' ? value.onlyBest : fallback.onlyBest,
  };
}

function normalizeArticleFilterConfig(value: unknown): ArticleFilterConfigImpl {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([channelId]) => channelId.length > 0)
      .map(([channelId, filter]) => [
        channelId,
        normalizeArticleFilter(filter),
      ]),
  );
}

function normalizeUISettings(value: unknown): UISettings {
  const fallback = createDefaultUISettings();
  if (!isRecord(value)) return fallback;

  const booleanValue = (key: keyof UISettings): boolean => {
    const candidate = value[key];
    const defaultValue = fallback[key];
    return typeof candidate === 'boolean'
      ? candidate
      : typeof defaultValue === 'boolean'
        ? defaultValue
        : false;
  };

  const modalTab = value.lastModalTab;
  const lastModalTab =
    modalTab === 'filter' || modalTab === 'ui' || modalTab === 'subscribe'
      ? modalTab
      : fallback.lastModalTab;

  const rawWidth = value.contentWidth;
  const contentWidth =
    typeof rawWidth === 'number' && Number.isFinite(rawWidth)
      ? Math.min(MAX_CONTENT_WIDTH, Math.max(MIN_CONTENT_WIDTH, rawWidth))
      : fallback.contentWidth;

  return {
    hideScrollbar: booleanValue('hideScrollbar'),
    hideBlur: booleanValue('hideBlur'),
    hideNavControl: booleanValue('hideNavControl'),
    hideArticleTitle: booleanValue('hideArticleTitle'),
    hideArticleAuthor: booleanValue('hideArticleAuthor'),
    hideArticleTime: booleanValue('hideArticleTime'),
    hideArticleView: booleanValue('hideArticleView'),
    lastModalTab,
    hiddenChannels: uniqueStrings(value.hiddenChannels),
    contentWidth,
  };
}

function normalizeSeriesSource(
  value: unknown,
  legacySeriesMode = false,
): SeriesSource {
  return value === 'article' ||
    value === 'scrap' ||
    value === 'home' ||
    value === 'none'
    ? value
    : legacySeriesMode
      ? 'article'
      : 'none';
}

function normalizeHomeSeriesState(value: unknown): HomeSeriesState {
  const fallback = createDefaultHomeSeriesState();
  if (!isRecord(value)) return fallback;

  const channels = uniqueStrings(value.channels);
  const channelSet = new Set(channels);
  const cursorEntries = isRecord(value.cursors)
    ? Object.entries(value.cursors).filter(
        (entry): entry is [string, number] =>
          channelSet.has(entry[0]) &&
          Number.isSafeInteger(entry[1]) &&
          (entry[1] as number) > 0,
      )
    : [];

  return {
    channels,
    cursors: Object.fromEntries(cursorEntries),
    exhaustedChannels: uniqueStrings(value.exhaustedChannels).filter(
      (channelId) => channelSet.has(channelId),
    ),
  };
}

function normalizeArticleList(value: unknown): string[] {
  return uniqueStrings(value);
}

function normalizeStoredIndex(value: string | null): number {
  if (value === null || value.trim() === '') return -1;
  const index = Number(value);
  return Number.isSafeInteger(index) && index >= -1 ? index : -1;
}

export {
  DEFAULT_ARTICLE_FILTER,
  DEFAULT_HOME_SERIES_STATE,
  DEFAULT_UI_SETTINGS,
  MAX_CONTENT_WIDTH,
  MIN_CONTENT_WIDTH,
  createDefaultArticleFilter,
  createDefaultHomeSeriesState,
  createDefaultUISettings,
  normalizeArticleFilter,
  normalizeArticleFilterConfig,
  normalizeArticleList,
  normalizeHomeSeriesState,
  normalizeSeriesSource,
  normalizeStoredIndex,
  normalizeUISettings,
  inferLegacyHomeSeriesState,
  readLegacyHomeSeriesChannels,
};
