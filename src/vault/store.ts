import {
  Store as CoreStore,
  createBaseInitialState,
} from '@feed/core/vault/store';
import type { BaseAppState, StateSubscriber } from '@feed/core/vault/store';

export type AppState = BaseAppState;
export type { StateSubscriber };

export function createInitialState(): AppState {
  return createBaseInitialState();
}

export class Store extends CoreStore<AppState> {
  constructor(initialState?: Partial<AppState>) {
    super(initialState, createInitialState);
  }
}
