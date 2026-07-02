/**
 * Re-export Store from vault/ to maintain backward compatibility.
 * All state management types are now defined in vault/store.ts.
 */
export { Store, createInitialState } from '@/vault/store';
export type { AppState, StateSubscriber } from '@/vault/store';
