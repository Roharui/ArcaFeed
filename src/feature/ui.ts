import type { VaultAdapter } from '@/vault';

function initUi(p: VaultAdapter): void {
  document.body.classList.add('rulifeed');
  document.body.classList.toggle(
    'rulifeed-article-page',
    p.href.mode === 'ARTICLE',
  );
  document
    .querySelectorAll(
      '.category_list, .category_menu, #board_top, [contenteditable]',
    )
    .forEach((element) => element.classList.add('swiper-no-swiping'));

  const updateSeriesLayout = (isSeriesMode: boolean) => {
    document.body.classList.toggle('hide-included-article-list', isSeriesMode);
    document.body.classList.toggle('hide-btns-board', isSeriesMode);
  };
  let seriesMode = p.isSeriesMode;
  updateSeriesLayout(seriesMode);
  p.subscribe((state) => {
    if (state.isSeriesMode === seriesMode) return;
    seriesMode = state.isSeriesMode;
    updateSeriesLayout(seriesMode);
  });
}

export { initUi };
