const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" title="게시글 이동 설정">
  <div id="category-all"></div>
  <hr>
  <div id="category"></div>
  <hr>
  <p>차단 제목 : <input type="text" id="exclude-title" style="float: right; width: 275px"></p>
</div>
`;

export class ModalManager {
  openArticleFilterModal() {
    if (!['ARTICLE', 'CHANNEL'].includes(this.mode)) return;

    if ($('#dialog').length) {
      $('#dialog').remove();
      return;
    }

    const dialog = $(NEXT_PAGE_MODAL_HTML);

    const checkFn = () => {
      const channelId = this.channelId;

      const tab = $('#dialog > #category > span > .category-check:checked')
        .toArray()
        .map((ele) => $(ele).val());

      const title = $('#dialog #exclude-title').val();

      const pageFilter = {
        tab,
        title: title.trim().length > 0 ? title.split(',') : [],
      };

      this.articleFilterConfig[channelId] = pageFilter;
      this.saveConfig();

      dialog.dialog('close');
    };

    const cancelFn = function () {
      dialog.dialog('close');
    };

    $('body').append(dialog);

    $('#dialog').dialog({
      modal: true,
      resizeable: false,
      width: '400px',
      buttons: {
        확인: checkFn,
        취소: cancelFn,
      },
      open: () => {
        const channelId = this.channelId;

        const { tab, title } = this.articleFilterConfig?.[channelId] || {
          tab: [],
          title: [],
        };

        const spanFn = (text, clsName, prop, fn) => {
          const checkBox = $('<input>', {
            type: 'checkbox',
            class: `category-check ${clsName}`,
            value: text,
          });
          checkBox.on('change', fn);

          const tabName = $('<span>', { text: text });
          const span = $('<span>', {
            style: `display: inline-block; background-color: #ddd; padding: 5px; margin: 3px; border-radius: 20px;`,
          });

          checkBox.prop('checked', prop);
          span.append(checkBox).append(tabName);

          return span;
        };

        const category = $('.board-category > span')
          .get()
          .map((ele) => $(ele).text().trim())
          .filter((text) => text !== '전체');

        category.splice(0, 0, '노탭');

        category
          .map((text) =>
            spanFn(text, 'ele-category', tab.includes(text), function () {
              if (
                $('#category > span > .category-check').length ===
                $('#category > span > .category-check:checked').length
              ) {
                $('#category-all > span > .ele-category-all').prop(
                  'checked',
                  true,
                );
              } else {
                $('#category-all > span > .ele-category-all').prop(
                  'checked',
                  false,
                );
              }
            }),
          )
          .forEach((ele) => $('#dialog #category').append(ele));

        const spanAll = spanFn(
          '전체',
          'ele-category-all',
          tab.length === 0,
          function () {
            $('#category > span > .category-check').prop(
              'checked',
              this.checked,
            );
          },
        );

        $('#dialog > #category-all').append(spanAll);

        $('#dialog #exclude-title').val(title.join(','));
      },
      close: function () {
        $('#dialog').remove();
      },
    });
  }
}
