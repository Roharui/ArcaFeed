
import Toastify from 'toastify-js'

import { getChannelId } from './url';
import { Vault } from '../vault';

const v = new Vault()

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" title="게시글 이동 설정">
    <p>허용 : <input type="text" id="include"></p>
    <p>차단 : <input type="text" id="exclude"></p>
</div>
`

const INIT_CONFIG_MODAL_HTML = `
<div id="dialog" title="기본 설정">
    <p>뷰어 기본 표시<input type="checkbox" id="default_viewer" style="float: right;"></p>
    <p>뷰어 기본 화면 맞춤<input type="checkbox" id="default_fitscreen" style="float: right;"></p>
</div>
`

function nextPageConfigModal() {
    if (!location.href.includes("/b/")) {
        return;
    }

    if ($('#dialog').length) {
        $('#dialog').remove()
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

                const pageFilter = {
                    include: pageInclude.trim().length > 0 ? pageInclude.split(",") : [],
                    exclude: pageExclude.trim().length > 0 ? pageExclude.split(",") : []
                }

                v.setPageFilter(channelId, pageFilter)

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

            let pageFilter = v.getPageFilter(channelId)

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
    if ($('#dialog').length) {
        $('#dialog').remove()
        return;
    }

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
                let DEFAULT_VIEWER = $('#dialog').find(`#default_viewer`).is(":checked")
                let DEFAULT_FITSCREEN = $('#dialog').find(`#default_fitscreen`).is(":checked")

                v.setViewerConfig({
                    defaultStart: DEFAULT_VIEWER,
                    fitScreen: DEFAULT_FITSCREEN,
                })

                $(this).dialog("close");
            },
            "취소": function () {
                $(this).dialog("close");
            },
        },
        open: function () {
            $('#dialog').find(`#default_viewer`).prop('checked', v.config.viewer.defaultStart)
            $('#dialog').find(`#default_fitscreen`).prop('checked', v.config.viewer.fitScreen)
        },
        close: function() {
            $('#dialog').remove()
        }
    });
}

export { nextPageConfigModal, initConfigModal }