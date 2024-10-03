
import Toastify from 'toastify-js'

import { CONFIG, getConfigWithKey, changeConfigWithValue, resetConfig } from "../../config";
import { getChannelId } from '../../utils';

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" title="게시글 이동 설정">
    <p>허용 : <input type="text" id="include"></p>
    <p>차단 : <input type="text" id="exclude"></p>
</div>
`

const INIT_CONFIG_MODAL_HTML = `
<div id="dialog" title="기본 설정">
    <p>댓글 숨기기<input type="checkbox" id="default_comment_hide" style="float: right;"></p>
    <p>우측 사이드바 숨기기<input type="checkbox" id="default_right_sidebar_hide" style="float: right;"></p>
    <p>기본 버튼 숨기기<input type="checkbox" id="defailt_hide_arca_btn" style="float: right;"></p>
    <p>모바일 버튼 추가<input type="checkbox" id="next_btn" style="float: right;"></p>
    <p>페이지 이동<input type="checkbox" id="no_refresh" style="float: right;"></p>
    <p>뷰어 기본 표시<input type="checkbox" id="default_viewer" style="float: right;"></p>
    <p>뷰어 기본 화면 맞춤<input type="checkbox" id="default_fitscreen" style="float: right;"></p>
</div>
`

function nextPageConfigModal() {
    if (!location.pathname.includes("/b/")) {
        return;
    }

    const dialog = $(NEXT_PAGE_MODAL_HTML)

    $("body").append(dialog)

    $('#dialog').dialog({
        modal: true,        // 배경색 어둡게 true, false
        resizeable: false,    // 사이즈 조절가능 여부
        buttons: {
            "확인": function () {
                const channelId = getChannelId()

                const pageInclude = $('#dialog').find("#include").val()
                const pageExclude = $('#dialog').find("#exclude").val()

                let pageFilterWrapper = getConfigWithKey(CONFIG.PAGE_FILTER)

                const pageFilter = {
                    include: pageInclude.trim().length > 0 ? pageInclude.split(",") : [],
                    exclude: pageExclude.trim().length > 0 ? pageExclude.split(",") : []
                }

                pageFilterWrapper[channelId] = pageFilter

                changeConfigWithValue(CONFIG.PAGE_FILTER, pageFilterWrapper)

                Toastify({
                    text: `게시글 허용 : ${pageInclude.length == 0 ? "<없음>" : pageInclude} / 게시글 차단 : ${pageExclude.length == 0 ? "<없음>" : pageExclude}`,
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
            const channelId = getChannelId()
            let pageFilter = getConfigWithKey(CONFIG.PAGE_FILTER)[channelId]

            if (pageFilter === undefined) {
                pageFilter = {
                    include: [],
                    exclude: []
                }
            }

            let { include , exclude } = pageFilter;

            $('#dialog').find("#include").val(include.join(","))
            $('#dialog').find("#exclude").val(exclude.join(","))
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
            "초기화": function () {
                resetConfig()
                $(this).dialog("close");
            },
            "확인": function () {
                let DEFAULT_COMMENT_HIDE = $('#dialog').find(`#${CONFIG.DEFAULT_COMMENT_HIDE}`).is(":checked")
                let DEFAULT_RIGHT_SIDEBAR_HIDE = $('#dialog').find(`#${CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE}`).is(":checked")
                let DEFAILT_HIDE_ARCA_BTN = $('#dialog').find(`#${CONFIG.DEFAILT_HIDE_ARCA_BTN}`).is(":checked")
                let NO_REFRESH = $('#dialog').find(`#${CONFIG.NO_REFRESH}`).is(":checked")
                let DEFAULT_VIEWER = $('#dialog').find(`#${CONFIG.DEFAULT_VIEWER}`).is(":checked")
                let DEFAULT_FITSCREEN = $('#dialog').find(`#${CONFIG.DEFAULT_FITSCREEN}`).is(":checked")
                let NEXT_BTN = $('#dialog').find(`#${CONFIG.NEXT_BTN}`).is(":checked")

                changeConfigWithValue(CONFIG.DEFAULT_COMMENT_HIDE, DEFAULT_COMMENT_HIDE)
                changeConfigWithValue(CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE, DEFAULT_RIGHT_SIDEBAR_HIDE)
                changeConfigWithValue(CONFIG.DEFAILT_HIDE_ARCA_BTN, DEFAILT_HIDE_ARCA_BTN)
                changeConfigWithValue(CONFIG.NO_REFRESH, NO_REFRESH)
                changeConfigWithValue(CONFIG.DEFAULT_VIEWER, DEFAULT_VIEWER)
                changeConfigWithValue(CONFIG.DEFAULT_FITSCREEN, DEFAULT_FITSCREEN)
                changeConfigWithValue(CONFIG.NEXT_BTN, NEXT_BTN)

                $(this).dialog("close");
            },
            "취소": function () {
                $(this).dialog("close");
            },
        },
        open: function () {
            $('#dialog').find(`#${CONFIG.DEFAULT_COMMENT_HIDE}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_COMMENT_HIDE))
            $('#dialog').find(`#${CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_RIGHT_SIDEBAR_HIDE))
            $('#dialog').find(`#${CONFIG.DEFAILT_HIDE_ARCA_BTN}`).prop('checked', getConfigWithKey(CONFIG.DEFAILT_HIDE_ARCA_BTN))
            $('#dialog').find(`#${CONFIG.NO_REFRESH}`).prop('checked', getConfigWithKey(CONFIG.NO_REFRESH))
            $('#dialog').find(`#${CONFIG.DEFAULT_VIEWER}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_VIEWER))
            $('#dialog').find(`#${CONFIG.DEFAULT_FITSCREEN}`).prop('checked', getConfigWithKey(CONFIG.DEFAULT_FITSCREEN))
            $('#dialog').find(`#${CONFIG.NEXT_BTN}`).prop('checked', getConfigWithKey(CONFIG.NEXT_BTN))
        },
        close: function() {
            $('#dialog').remove()
        }
    });
}

export { nextPageConfigModal, initConfigModal }