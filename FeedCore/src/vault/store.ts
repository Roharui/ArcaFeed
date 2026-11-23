import type {
  ArticleFilterConfigImpl,
  HrefImpl,
  SubscriptionFailure,
  UISettings,
} from '../types/vault';
import { mergeState, sameField } from './lazy-state';

export interface BaseAppState {
  href: HrefImpl;
  activeIndex: number;
  articleKey: string;
  articleList: string[];
  articleFilterConfig: ArticleFilterConfigImpl;
  isSeriesMode: boolean;
  isScrapMode: boolean;
  seriesChannels: string[];
  subscriptionFailures: SubscriptionFailure[];
  readingRevision: number;
  isShuffleMode: boolean;
  searchQuery: string;
  lastActiveIndex: number;
  uiSettings: UISettings;
}

export type StateSubscriber<TState extends BaseAppState = BaseAppState> = (
  state: TState,
) => void;

export const DEFAULT_HREF: HrefImpl = {
  mode: 'NOT_CHECKED',
  channelId: '',
  articleId: '',
  articleKey: '',
  search: '',
};

export const DEFAULT_UI_SETTINGS: UISettings = {
  hideScrollbar: true,
  hideBlur: true,
  hideNavControl: false,
  hideArticleTitle: false,
  hideArticleAuthor: false,
  hideArticleTime: false,
  hideArticleView: false,
  showVisitedIndicators: true,
  skipVisitedContexts: {},
  lastModalTab: 'filter',
  hiddenChannels: [],
  homeSeriesChannels: [],
  contentWidth: 700,
};

export function createBaseInitialState(): BaseAppState {
  return {
    href: { ...DEFAULT_HREF },
    activeIndex: -1,
    articleKey: '',
    articleList: [],
    articleFilterConfig: {},
    isSeriesMode: false,
    isScrapMode: false,
    seriesChannels: [],
    subscriptionFailures: [],
    readingRevision: 0,
    isShuffleMode: false,
    searchQuery: '',
    lastActiveIndex: -1,
    uiSettings: {
      ...DEFAULT_UI_SETTINGS,
      skipVisitedContexts: {},
      hiddenChannels: [],
      homeSeriesChannels: [],
    },
  };
}

export class Store<TState extends BaseAppState = BaseAppState> {
  private state: TState;
  private subscribers = new Set<StateSubscriber<TState>>();

  constructor(
    initialState?: Partial<TState>,
    createInitial: () => TState = createBaseInitialState as () => TState,
  ) {
    const base = createInitial();

    // Deep-merge uiSettings so newly added fields get default values
    // even when old IndexedDB data is missing them.
    if (
      initialState &&
      !Object.getOwnPropertyDescriptor(initialState, 'uiSettings')?.get &&
      initialState.uiSettings
    ) {
      initialState = {
        ...initialState,
        uiSettings: { ...base.uiSettings, ...initialState.uiSettings },
      };
    }

    this.state = mergeState(base, initialState);
  }

  getState(): Readonly<TState> {
    return this.state;
  }

  setState(patch: Partial<TState>): void {
    const changed = (Object.keys(patch) as (keyof TState)[]).some(
      (key) => !sameField(this.state, patch as TState, key),
    );
    if (!changed) return;
    this.state = mergeState(this.state, patch);
    this.notify();
  }

  replaceState(newState: TState): void {
    if (newState === this.state) return;
    this.state = newState;
    this.notify();
  }

  subscribe(subscriber: StateSubscriber<TState>): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify(): void {
    const snapshot = this.state;
    this.subscribers.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('[Store] Subscriber error:', err);
      }
    });
  }
}
