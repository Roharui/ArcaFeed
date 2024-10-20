import { render } from '@src/utils/render';
import { getChannelId } from '@src/utils/url';
import { isCurPageArticle } from '@src/utils/check';

function noRefrershLink() {
  $('a').on('click', function (e) {
    const href = $(this).attr('href');

    if (getChannelId(href) !== undefined && isCurPageArticle()) {
      e.preventDefault();
      render(href);
    }
  });
}

export { noRefrershLink };
