import { getChannelId } from './url';
import { Vault } from 'src/vault';

const v = new Vault();

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" title="게시글 이동 설정">
    <div id="category"></div>
    <hr>
    <p>차단 제목 : <input type="text" id="exclude-title" style="float: right; width: 275px"></p>
</div>
`;

const INIT_CONFIG_MODAL_HTML = `
<div id="dialog" title="기본 설정">
    <p>뷰어 기본 표시<input type="checkbox" id="default_viewer" style="float: right;"></p>
    <p>뷰어 기본 화면 맞춤<input type="checkbox" id="default_fitscreen" style="float: right;"></p>
    <p>페이지 이동 버튼 활성화<input type="checkbox" id="btn_nextBtn" style="float: right;"></p>
    <p>설정 버튼 확장<input type="checkbox" id="btn_navExpand" style="float: right;"></p>
</div>
`;

function nextPageConfigModal() {
  if (!location.href.includes('/b/')) {
    return;
  }

  if ($('#dialog').length) {
    $('#dialog').remove();
    return;
  }

  const dialog = $(NEXT_PAGE_MODAL_HTML);

  const checkFn = function () {
    const channelId = getChannelId();

    const excludeCategory = $('#dialog')
      .find('.ele-category')
      .filter((i, ele) => !$(ele).is(':checked'))
      .map((i, ele) => $(ele).val())
      .get();
    const excludeTitle = $('#dialog').find('#exclude-title').val();

    const pageFilter = {
      excludeCategory: excludeCategory,
      excludeTitle:
        excludeTitle.trim().length > 0 ? excludeTitle.split(',') : [],
    };

    v.setPageFilter(channelId, pageFilter);

    $(this).dialog('close');
  };

  const cancelFn = function () {
    $(this).dialog('close');
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
    open: function () {
      const channelId = getChannelId();

      let pageFilter = v.getPageFilter(channelId);

      if (pageFilter === undefined) {
        pageFilter = {
          excludeCategory: [],
          excludeTitle: [],
        };
      }

      let { excludeCategory, excludeTitle } = pageFilter;

      $('.board-category > span').each(function (i, ele) {
        let text = $(ele).text().includes('전체')
          ? '노탭'
          : $(ele).text().trim();

        const checkBox = $('<input>', {
          type: 'checkbox',
          class: 'ele-category',
          value: text,
        });
        const tabName = $('<span>', { text: text });

        const span = $('<span>', {
          style: `display: inline-block; background-color: #ddd; padding: 5px; margin: 3px; border-radius: 20px;`,
        });

        span.append(checkBox).append(tabName);

        checkBox.prop('checked', !excludeCategory.includes(text));

        $('#dialog').find('#category').append(span);
      });

      $('#dialog').find('#exclude-title').val(excludeTitle.join(','));
    },
    close: function () {
      $('#dialog').remove();
    },
  });
}

function initConfigModal() {
  if ($('#dialog').length) {
    $('#dialog').remove();
    return;
  }

  const dialog = $(INIT_CONFIG_MODAL_HTML);

  $('body').append(dialog);

  const checkFn = function () {
    let DEFAULT_VIEWER = $('#dialog').find(`#default_viewer`).is(':checked');
    let DEFAULT_FITSCREEN = $('#dialog')
      .find(`#default_fitscreen`)
      .is(':checked');

    let BTN_NEXTBTN = $('#dialog').find(`#btn_nextBtn`).is(':checked');
    let BTN_NAVEXPAND = $('#dialog').find(`#btn_navExpand`).is(':checked');

    v.setConfig('viewer', {
      defaultStart: DEFAULT_VIEWER,
      fitScreen: DEFAULT_FITSCREEN,
    });

    v.setConfig('btn', {
      nextBtn: BTN_NEXTBTN,
      navExpand: BTN_NAVEXPAND,
    });

    $(this).dialog('close');
  };

  const cancelFn = function () {
    $(this).dialog('close');
  };

  $('#dialog').dialog({
    modal: true,
    resizeable: false,
    buttons: {
      초기화: function () {
        resetConfig();
        $(this).dialog('close');
      },
      확인: checkFn,
      취소: cancelFn,
    },
    open: function () {
      $('#dialog')
        .find(`#default_viewer`)
        .prop('checked', v.config.viewer.defaultStart);
      $('#dialog')
        .find(`#default_fitscreen`)
        .prop('checked', v.config.viewer.fitScreen);
      $('#dialog').find(`#btn_nextBtn`).prop('checked', v.config.btn.nextBtn);
      $('#dialog')
        .find(`#btn_navExpand`)
        .prop('checked', v.config.btn.navExpand);
    },
    close: function () {
      $('#dialog').remove();
    },
  });
}

export { nextPageConfigModal, initConfigModal };
