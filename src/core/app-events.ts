import { EventBus } from './event-bus';

export type AppEvent =
  | 'init'
  | 'toNextPage'
  | 'toPrevPage'
  | 'toNextLinkForce'
  | 'renderNextPage'
  | 'renderPrevPage'
  | 'enableSeries'
  | 'enableScrapSeries'
  | 'toggleShuffle'
  | 'showModal'
  | 'checkFilterModal'
  | 'checkUIModal'
  | 'checkSubscribeModal'
  | 'closeModal'
  | 'toggleSwiper';

// Features depend on this transport, never on the application composition root.
export const eventBus = new EventBus<Record<AppEvent, []>>();
