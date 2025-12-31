import $ from 'jquery';

import { ArcaFeed } from '@/core';

import type { Vault } from '@/vault';

const MODAL_UI_TAB = `    
<div class="helper-modal-tab helper-modal-ui"> 
  <div class="ui-title">채널 UI 설정</div>
  <span>준비중</span>
  <div class="ui-title">게시글 UI 설정</div>
  <label>
    네비게이션 버튼
    <input type="checkbox" id="nav-btn-ui"/>
  </label>
  <label for="nav-list-ui">
    게시글 목록
    <input type="checkbox" id="nav-list-ui"/>
  </label>
  <div id="ui-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="check-btn" class="helper-button button" type="button" value="확인"/>
    <input id="cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

function createUISettingModal(p: Vault): JQuery<HTMLElement> {
  const $uiTab = $(MODAL_UI_TAB);

  $uiTab
    .find('#check-btn')
    .on('click', () => ArcaFeed.runEvent('checkUIModal'));
  $uiTab.find('#cancel-btn').on('click', () => ArcaFeed.runEvent('closeModal'));

  return $uiTab;
}

export { createUISettingModal };
