import { EventBus } from './event-bus';

export const APP_EVENTS = [
  'init',
  'toNextPage',
  'toPrevPage',
  'toNextLinkForce',
  'renderNextPage',
  'renderPrevPage',
  'enableSeries',
  'enableScrapSeries',
  'toggleShuffle',
  'showModal',
  'checkFilterModal',
  'checkUIModal',
  'checkSubscribeModal',
  'closeModal',
  'toggleSwiper',
] as const;

export type AppEvent = (typeof APP_EVENTS)[number];

// Features depend on this transport, never on the application composition root.
export const eventBus = new EventBus<Record<AppEvent, []>>();
