import {
  Store as CoreStore,
  createBaseInitialState,
} from '@feed/core/vault/store';
import type {
  BaseAppState,
  StateSubscriber as CoreStateSubscriber,
} from '@feed/core/vault/store';

export interface AppState extends BaseAppState {
  nextPageUrl: string;
}

export type StateSubscriber = CoreStateSubscriber<AppState>;

export function createInitialState(): AppState {
  return {
    ...createBaseInitialState(),
    nextPageUrl: '',
  };
}

export class Store extends CoreStore<AppState> {
  constructor(initialState?: Partial<AppState>) {
    super(initialState, createInitialState);
  }
}
