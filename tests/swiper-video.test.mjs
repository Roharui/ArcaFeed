import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader } from './source-loader.mjs';

function fixture() {
  const handlers = new Map();
  const listeners = new Map();
  const frames = new Map();
  let frameId = 0;
  function video(playing) {
    return {
      tagName: 'VIDEO',
      paused: !playing,
      ended: false,
      isConnected: true,
      pauses: 0,
      plays: 0,
      pause() {
        this.paused = true;
        this.pauses++;
      },
      play() {
        this.paused = false;
        this.plays++;
        return Promise.resolve();
      },
    };
  }
  const videos = [video(true), video(false)];
  const swiper = {
    activeIndex: 1,
    animating: false,
    destroyed: false,
    el: {
      querySelectorAll: () => videos,
      contains: (video) => videos.includes(video),
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name) => listeners.delete(name),
    },
    on: (name, fn) => handlers.set(name, fn),
  };
  const { installSwiperVideoPause } = sourceLoader({
    globals: {
      requestAnimationFrame: (fn) => {
        frames.set(++frameId, fn);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
  })('src/feature/swiper/video.ts');
  installSwiperVideoPause(swiper);
  return {
    swiper,
    videos,
    listeners,
    frames,
    emit: (name) => handlers.get(name)?.(),
    flush() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((fn) => fn());
    },
  };
}

test('only a horizontal drag pauses videos; snapback resumes only previously playing videos', () => {
  const f = fixture();
  f.emit('touchEnd');
  f.flush();
  assert.equal(f.videos[0].pauses, 0);
  f.emit('sliderFirstMove');
  assert.equal(f.videos[0].paused, true);
  assert.equal(f.videos[1].pauses, 0);
  f.listeners.get('play')({ target: f.videos[1] });
  assert.equal(f.videos[1].paused, true);
  f.emit('touchEnd');
  f.swiper.animating = true;
  f.emit('beforeTransitionStart');
  f.flush();
  assert.equal(f.videos[0].plays, 0);
  f.swiper.animating = false;
  f.emit('transitionEnd');
  assert.equal(f.videos[0].plays, 1);
  assert.equal(f.videos[1].plays, 0);
});

test('navigation stays paused and a silent reset to the article resumes playback', () => {
  const f = fixture();
  f.emit('beforeTransitionStart');
  f.swiper.activeIndex = 2;
  f.emit('transitionEnd');
  assert.equal(f.videos[0].plays, 0);
  f.swiper.activeIndex = 1;
  f.emit('setTranslate');
  f.flush();
  assert.equal(f.videos[0].plays, 1);
});

test('destroy cancels pending work and removes the playback guard', () => {
  const f = fixture();
  f.emit('sliderFirstMove');
  f.emit('touchEnd');
  f.swiper.destroyed = true;
  f.emit('destroy');
  assert.equal(f.frames.size, 0);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.videos[0].plays, 0);
});
