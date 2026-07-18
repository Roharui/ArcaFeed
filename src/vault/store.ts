/**
 * Centralized state store with immutable updates and subscription support.
 * Replaces the mutable Vault god-object with a Flux-like single-direction data flow.
 *
 * Moved to vault/ to avoid circular dependency (core ↔ vault).
 */

import type { HrefImpl, ArticleFilterConfigImpl, UISettings } from '@/types';

export interface AppState {
  href: HrefImpl;
  activeIndex: number;
  articleKey: string;
  articleList: string[];
  articleFilterConfig: ArticleFilterConfigImpl;
  isSeriesMode: boolean;
  searchQuery: string;
  lastActiveIndex: number;
  uiSettings: UISettings;
  pluginSettings: Record<string, boolean>;
}

export type StateSubscriber = (state: AppState) => void;

const DEFAULT_HREF: HrefImpl = {
  mode: 'NOT_CHECKED',
  channelId: '',
  articleId: '',
  articleKey: '',
  search: '',
};

const DEFAULT_UI_SETTINGS: UISettings = {
  hideScrollbar: true,
  hideBlur: true,
  hideNavControl: false,
  hideArticleTitle: false,
  hideArticleAuthor: false,
  hideArticleTime: false,
  hideArticleView: false,
  lastModalTab: 'filter',
  contentWidth: 700,
};

export function createInitialState(): AppState {
  return {
    href: { ...DEFAULT_HREF },
    activeIndex: -1,
    articleKey: '',
    articleList: [],
    articleFilterConfig: {},
    isSeriesMode: false,
    searchQuery: '',
    lastActiveIndex: -1,
    uiSettings: { ...DEFAULT_UI_SETTINGS },
    pluginSettings: {},
  };
}

export class Store {
  private state: AppState;
  private subscribers = new Set<StateSubscriber>();

  constructor(initialState?: Partial<AppState>) {
    const base = createInitialState();

    // Deep-merge uiSettings so newly added fields get default values
    // even when old localStorage data is missing them.
    if (initialState?.uiSettings) {
      initialState = {
        ...initialState,
        uiSettings: { ...base.uiSettings, ...initialState.uiSettings },
      };
    }

    this.state = { ...base, ...initialState };
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  setState(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  replaceState(newState: AppState): void {
    this.state = newState;
    this.notify();
  }

  subscribe(subscriber: StateSubscriber): () => void {
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
