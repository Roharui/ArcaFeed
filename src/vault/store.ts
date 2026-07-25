/**
 * Centralized state store with immutable updates and subscription support.
 * Replaces the mutable Vault god-object with a Flux-like single-direction data flow.
 *
 * Moved to vault/ to avoid circular dependency (core ↔ vault).
 */

import type {
  ArticleFilterConfigImpl,
  HomeSeriesState,
  HrefImpl,
  SeriesSource,
  UISettings,
} from '@/types';
import {
  createDefaultHomeSeriesState,
  createDefaultUISettings,
  normalizeHomeSeriesState,
  normalizeUISettings,
} from './schema';

export interface AppState {
  href: HrefImpl;
  activeIndex: number;
  articleKey: string;
  articleList: string[];
  articleFilterConfig: ArticleFilterConfigImpl;
  seriesSource: SeriesSource;
  homeSeriesState: HomeSeriesState;
  searchQuery: string;
  lastActiveIndex: number;
  uiSettings: UISettings;
}

export type StateSubscriber = (state: AppState) => void;

const DEFAULT_HREF: HrefImpl = {
  mode: 'NOT_CHECKED',
  channelId: '',
  articleId: '',
  articleKey: '',
  search: '',
};

export function createInitialState(): AppState {
  return {
    href: { ...DEFAULT_HREF },
    activeIndex: -1,
    articleKey: '',
    articleList: [],
    articleFilterConfig: {},
    seriesSource: 'none',
    homeSeriesState: createDefaultHomeSeriesState(),
    searchQuery: '',
    lastActiveIndex: -1,
    uiSettings: createDefaultUISettings(),
  };
}

export class Store {
  private state: AppState;
  private subscribers = new Set<StateSubscriber>();

  constructor(initialState?: Partial<AppState>) {
    const base = createInitialState();

    if (initialState?.uiSettings) {
      initialState = {
        ...initialState,
        uiSettings: normalizeUISettings(initialState.uiSettings),
      };
    }
    if (initialState?.homeSeriesState) {
      initialState = {
        ...initialState,
        homeSeriesState: normalizeHomeSeriesState(initialState.homeSeriesState),
      };
    }

    this.state = { ...base, ...initialState };
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  setState(patch: Partial<AppState>): void {
    const hasChanges = Object.entries(patch).some(
      ([key, value]) => this.state[key as keyof AppState] !== value,
    );
    if (!hasChanges) return;

    this.state = { ...this.state, ...patch };
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
