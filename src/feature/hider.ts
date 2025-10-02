// vault

import $ from 'jquery';

import type { Vault } from '@/vault';
import type { ArticleShowMode } from '@/types';

function doHide(mode?: ArticleShowMode): (v: Vault) => Vault {
  return (v: Vault) => {
    if (!v.isCurrentMode('ARTICLE')) return v;

    const $html = $('.root-container'); // this.vault.currentSlide

    let currentShow = mode || 'Article';
    const previousShow = $html.attr('data-show') || 'NONE';

    if (currentShow === previousShow) currentShow = 'Article';

    $html.find('.article-wrapper > div').toggle(currentShow === 'Article');
    $html.find('#comment').toggle(currentShow === 'Comment');

    $html.attr('data-show', currentShow);

    return v;
  };
}

export { doHide };
