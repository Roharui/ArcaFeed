import { toggleBtn } from "./btn";
import { noRefrershLink } from "./noRefresh";
import { viewInit } from "../event/viewer";
import { Vault } from "../vault";

const v = new Vault()

const CONFIG = {
    nextPageUrl: true,
    noRefresh: true,
    toggleBtn: true,
    viewer: true,
    hideControlBtn: true
}

const CONFIG_FN = {
    noRefresh: noRefrershLink,
    nextPageUrl: () => v.setPageUrl(),
    toggleBtn: toggleBtn,
    viewer: viewInit,
    hideControlBtn: () => {
        $(".nav-control").hide()
        $('head').append($('<style>', {text: `.btn-wrapper { bottom: 1rem !important; }`}))
    }
}

function init() {
    Object.entries(CONFIG).forEach(([k, v]) => {
        if (!v) return;

        CONFIG_FN[k]()
    })
}

export { init }