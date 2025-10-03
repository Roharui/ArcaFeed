// vault

import $ from 'jquery';

import type { Vault } from '@/vault';
import type { ArticleShowMode, PromiseFunc } from '@/types';

function doHide(mode?: ArticleShowMode): PromiseFunc {
  return (v?: Vault) => {
    if (!v) return;
    if (!v.isCurrentMode('ARTICLE')) return;

    const $html = $('.root-container'); // this.vault.currentSlide

    let currentShow = mode || 'Article';
    const previousShow = $html.attr('data-show') || 'NONE';

    if (currentShow === previousShow) currentShow = 'Article';

    $html.find('.article-wrapper > div').toggle(currentShow === 'Article');
    $html.find('#comment').toggle(currentShow === 'Comment');

    $html.attr('data-show', currentShow);
  };
}

export { doHide };
