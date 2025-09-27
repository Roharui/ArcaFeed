export class EventManager {
  initEvent() {
    $(document).on('keydown', (e) => {
      if (e.key === 'ArrowRight') this.nextLink();
      if (e.key === 'ArrowLeft') this.prevLink();
    });
  }
}
