import type Swiper from 'swiper';

// Pause decoding during a drag and its transition, without polling video frames.
export function installSwiperVideoPause(swiper: Swiper): void {
  const paused = new Set<HTMLVideoElement>();
  let dragging = false;
  let blocked = false;
  let frame: number | null = null;

  function pause(): void {
    blocked = true;
    for (const video of Array.from(swiper.el.querySelectorAll('video'))) {
      if (video.paused || video.ended) continue;
      paused.add(video);
      video.pause();
    }
  }

  function resume(): void {
    if (swiper.destroyed || dragging || swiper.animating) return;
    // Keep videos stopped while leaving the article for a neighbouring slide.
    if (swiper.activeIndex !== 1) return;
    blocked = false;
    for (const video of paused) {
      if (video.isConnected && swiper.el.contains(video)) {
        void video.play().catch(() => {
          // Autoplay policy may require the user to press play again.
        });
      }
    }
    paused.clear();
  }

  function preventPlay(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (blocked && video?.tagName === 'VIDEO') video.pause();
  }

  swiper.el.addEventListener('play', preventPlay, true);
  swiper.on('sliderFirstMove', () => {
    dragging = true;
    pause();
  });
  swiper.on('beforeTransitionStart', pause);
  swiper.on('touchEnd', () => {
    dragging = false;
    // touchEnd fires before Swiper chooses whether to snap back or navigate.
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = null;
      resume();
    });
  });
  swiper.on('transitionEnd', resume);
  swiper.on('setTranslate', () => {
    // Also handle zero-duration resets that suppress transition callbacks.
    if (blocked && !dragging && !swiper.animating && frame === null) {
      frame = requestAnimationFrame(() => {
        frame = null;
        resume();
      });
    }
  });
  swiper.on('destroy', () => {
    swiper.el.removeEventListener('play', preventPlay, true);
    if (frame !== null) cancelAnimationFrame(frame);
    paused.clear();
  });
}
