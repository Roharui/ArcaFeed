/** Structural subset of Swiper used by shared feed helpers (zero runtime dependency). */
export interface SwiperLike {
  el: HTMLElement;
  wrapperEl: HTMLElement;
  enabled: boolean;
  destroyed: boolean;
  animating: boolean;
  activeIndex: number;
  allowSlidePrev: boolean;
  allowSlideNext: boolean;
  params: { speed?: number };
  on(event: any, handler: (...args: any[]) => void): unknown;
  slideTo?(index: number, speed?: number, runCallbacks?: boolean): unknown;
}
