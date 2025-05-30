import { Vault } from 'src/vault';

import { toggleBtn } from './btn';
import { getChannelId } from 'src/utils/url';

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
  <p><b>뷰어 설정</b></p>  
  <p>뷰어 기본 표시<input type="checkbox" id="default_viewer" style="float: right;"></p>
  <p>뷰어 기본 화면 맞춤<input type="checkbox" id="default_fitscreen" style="float: right;"></p>
  <p><b>표시 설정</b></p>
  <p>원본 이미지 숨기기<input type="checkbox" id="hide_ori_img" style="float: right;"></p>
  <p>비활성화 탭 숨기기<input type="checkbox" id="hide_tab" style="float: right;"></p>
  <p>댓글 숨기기<input type="checkbox" id="hide_comment" style="float: right;"></p>
  <p><b>버튼 설정</b></p>
  <p>페이지 이동 버튼 활성화<input type="checkbox" id="btn_nextBtn" style="float: right;"></p>
  <p><b>단축키 설정</b></p>
  <p>단축키 활성화<input type="checkbox" id="shortcut" style="float: right;"></p>
  <br>
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

    const excludeCategory = $('#dialog .ele-category')
      .filter((i, ele) => !$(ele).is(':checked'))
      .map((i, ele) => $(ele).val())
      .get();
    const excludeTitle = $('#dialog #exclude-title').val();

    const pageFilter = {
      excludeCategory,
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

      const { excludeCategory, excludeTitle } = v.getPageFilter(channelId) ?? {
        excludeCategory: [],
        excludeTitle: [],
      };

      const spanFn = (text, clsName, prop) => {
        const checkBox = $('<input>', {
          type: 'checkbox',
          class: clsName,
          value: text,
        });
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
          spanFn(text, 'ele-category', !excludeCategory.includes(text)),
        )
        .forEach((ele) => $('#dialog #category').append(ele));

      $('#dialog #exclude-title').val(excludeTitle.join(','));
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
    const defaultStart = $('#dialog #default_viewer').is(':checked');
    const fitScreen = $('#dialog #default_fitscreen').is(':checked');
    const hideOriImg = $('#dialog #hide_ori_img').is(':checked');
    const hideTab = $('#dialog #hide_tab').is(':checked');
    const hideComment = $('#dialog #hide_comment').is(':checked');
    const shortcut = $('#dialog #shortcut').is(':checked');

    v.setConfig('viewer', {
      defaultStart,
      fitScreen,
    });

    v.setConfig('hide', {
      hideOriImg,
      hideTab,
      hideComment,
    });

    v.setConfig('event', {
      shortcut,
    });

    const nextBtn = $('#dialog #btn_nextBtn').is(':checked');

    v.setConfig('btn', {
      nextBtn,
    });

    toggleBtn();

    $(this).dialog('close');
  };

  const cancelFn = function () {
    $(this).dialog('close');
  };

  $('#dialog').dialog({
    modal: true,
    resizeable: false,
    buttons: {
      확인: checkFn,
      취소: cancelFn,
    },
    open: function () {
      // 뷰어 설정정
      $('#dialog #default_viewer').prop(
        'checked',
        v.config.viewer.defaultStart,
      );
      $('#dialog #default_fitscreen').prop(
        'checked',
        v.config.viewer.fitScreen,
      );
      $('#dialog #viewer_nav').prop('checked', v.config.viewer.fitScreen);

      // 게시글 설정
      $('#dialog #hide_ori_img').prop('checked', v.config.hide.hideOriImg);

      // 버튼 설정
      $('#dialog #btn_nextBtn').prop('checked', v.config.btn.nextBtn);

      // 목록 설정정
      $('#dialog #hide_tab').prop('checked', v.config.hide.hideTab);
      $('#dialog #hide_comment').prop('checked', v.config.hide.hideComment);

      //단축키 설정
      $('#dialog #shortcut').prop('checked', v.config.event.shortcut);
    },
    close: function () {
      $('#dialog').remove();
    },
  });
}

export { nextPageConfigModal, initConfigModal };
