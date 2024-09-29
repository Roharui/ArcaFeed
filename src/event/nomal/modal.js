
import Toastify from 'toastify-js'

import { CONFIG, getConfigWithKey, changeConfigWithValue } from "../../config";

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" title="페이지 이동 설정">
    <p>허용 : <input type="text" id="include"></p>
    <p>차단 : <input type="text" id="exclude"></p>
</div>
`

const INIT_CONFIG_MODAL_HTML = `
<div id="dialog" title="기본 설정">
    <p>댓글 숨기기<input type="checkbox" id="default_comment_hide"></p>
    <p>우측 사이드바 숨기기<input type="checkbox" id="default_right_sidebar_hide"></p>
    <p>뷰어 기본 표시<input type="checkbox" id="default_viewer"></p>
    <p>뷰어 기본 화면 맞춤<input type="checkbox" id="default_widthfit"></p>
</div>
`

function nextPageConfigModal() {
    const dialog = $(NEXT_PAGE_MODAL_HTML)
    $("body").append(dialog)

    $('#dialog').dialog({
        modal: true,        // 배경색 어둡게 true, false
        resizeable: false,    // 사이즈 조절가능 여부
        buttons: {
            "확인": function () {
                const pageInclude = $('#dialog').find("#include").val()
                const pageExclude = $('#dialog').find("#exclude").val()

                changeConfigWithValue(CONFIG.NEXT_PAGE_INCLUDE, pageInclude)
                changeConfigWithValue(CONFIG.NEXT_PAGE_EXCLUDE, pageExclude)

                Toastify({
                    text: `다음 탭 허용 : ${pageInclude} / 다음 탭 차단 : ${pageExclude}`,
                    className: "info",
                    style: {
                        background: "linear-gradient(to right, #00b09b, #96c93d)",
                    }
                }).showToast();

                $(this).dialog("close");
            },
            "취소": function () {
                $(this).dialog("close");
            },
        },
        open: function () {
            $('#dialog').find("#include").val(getConfigWithKey(CONFIG.NEXT_PAGE_INCLUDE))
            $('#dialog').find("#exclude").val(getConfigWithKey(CONFIG.NEXT_PAGE_EXCLUDE))
        },
        close: function() {
            $('#dialog').remove()
        }
    });
}

function initConfigModal() {
    const dialog = $(INIT_CONFIG_MODAL_HTML)
    $("body").append(dialog)

    $('#dialog').dialog({
        modal: true,        // 배경색 어둡게 true, false
        resizeable: false,    // 사이즈 조절가능 여부
        buttons: {
            "확인": function () {
                let DEFAULT_COMMENT_HIDE = $('#dialog').find(`#${CONFIG.DEFAULT_COMMENT_HIDE}`).is(":checked")
                let DEFAULT_RIGHT_SIDEBAR_HIDE = $('#dialog').find(`#${CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE}`).is(":checked")
                let DEFAULT_VIEWER = $('#dialog').find(`#${CONFIG.DEFAULT_VIEWER}`).is(":checked")
                let DEFAULT_WIDTHFIT = $('#dialog').find(`#${CONFIG.DEFAULT_WIDTHFIT}`).is(":checked")

                changeConfigWithValue(CONFIG.DEFAULT_COMMENT_HIDE, DEFAULT_COMMENT_HIDE)
                changeConfigWithValue(CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE, DEFAULT_RIGHT_SIDEBAR_HIDE)
                changeConfigWithValue(CONFIG.DEFAULT_VIEWER, DEFAULT_VIEWER)
                changeConfigWithValue(CONFIG.DEFAULT_WIDTHFIT, DEFAULT_WIDTHFIT)

                $(this).dialog("close");
            },
            "취소": function () {
                $(this).dialog("close");
            },
        },
        open: function () {
            $('#dialog').find(`#${CONFIG.DEFAULT_COMMENT_HIDE}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_COMMENT_HIDE))
            $('#dialog').find(`#${CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE))
            $('#dialog').find(`#${CONFIG.DEFAULT_VIEWER}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_VIEWER))
            $('#dialog').find(`#${CONFIG.DEFAULT_WIDTHFIT}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_WIDTHFIT))
        },
        close: function() {
            $('#dialog').remove()
        }
    });
}

export { nextPageConfigModal, initConfigModal }