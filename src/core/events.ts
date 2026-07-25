const APP_EVENT_NAMES = [
  'init',
  'toNextPage',
  'toPrevPage',
  'toNextLinkForce',
  'renderNextPage',
  'renderPrevPage',
  'enableSeries',
  'enableScrapSeries',
  'showModal',
  'checkFilterModal',
  'checkUIModal',
  'checkSubscribeModal',
  'closeModal',
  'toggleSwiper',
] as const;

type AppEventName = (typeof APP_EVENT_NAMES)[number];

export { APP_EVENT_NAMES };
export type { AppEventName };
