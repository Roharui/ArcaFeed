
import Toastify from 'toastify-js'

import { viewInit } from '../event/viewer';
import { seriesInit } from '../event/nomal/series';
import { toggleBtn } from '../utils/btn';
import { renderPage } from '../utils/link';
import { Vault } from '../vault';

const DEFAULT_CONFIG_KEY = "arcalive_tampermonkey_config"

const CONFIG = {
    DEFAULT_COMMENT_HIDE: "default_comment_hide",
    DEFAULT_RIGHT_SIDEBAR_HIDE: "default_right_sidebar_hide",
    DEFAILT_HIDE_ARCA_BTN: "defailt_hide_arca_btn",
    DEFAULT_VIEWER: "default_viewer",
    DEFAULT_FITSCREEN: "default_fitscreen",
    NO_REFRESH: "no_refresh",
    NEXT_BTN: "next_btn",
    PAGE_FILTER: "page_filter"
}

const DEFAULT_CONFIG = {
    default_comment_hide: false,
    default_right_sidebar_hide: true,
    defailt_hide_arca_btn: false,
    default_viewer: false,
    default_fitscreen: false,
    no_refresh: false,
    next_btn: true,
    page_filter: {},
}

function getConfigWithKey(key) {
    if (localStorage.getItem(DEFAULT_CONFIG_KEY) == undefined) {
        localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    }

    let config = JSON.parse(localStorage.getItem(DEFAULT_CONFIG_KEY))

    return config[key]
}

function config() {
    if (localStorage.getItem(DEFAULT_CONFIG_KEY) == undefined) {
        localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    }

    let config = JSON.parse(localStorage.getItem(DEFAULT_CONFIG_KEY))

    $("#comment").toggle(!config.default_comment_hide)
    $(".right-sidebar").toggle(!config.default_right_sidebar_hide)
    $(".nav-control").toggle(!config.defailt_hide_arca_btn)

    if (config.defailt_hide_arca_btn) {
        $('head').append($('<style>', {text: `.btn-wrapper { bottom: 1rem !important; }`}))
    }

    if (config.no_refresh) {
        $("a").on("click", function(e) {

            if ($(this).attr("href").includes("/b/") && $(".article-wrapper").length > 0) {
                e.preventDefault();
                renderPage(this.href)
            }

        })

    }
    
    new Vault().pullPage()
    
    toggleBtn(config.next_btn);
    
    viewInit(config.default_viewer, config.default_fitscreen)
    seriesInit()
}

function resetConfig() {
    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    config()

    Toastify({
        text: "Reset Config Complete",
        className: "info",
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        }
    }).showToast();
}

function changeConfig(key) {
    let _config = JSON.parse(localStorage.getItem(DEFAULT_CONFIG_KEY))

    _config[key] = !_config[key]

    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(_config))

    config()

    Toastify({
        text: `Config - ${key} : ${_config[key] ? "ON" : "OFF"}`,
        className: "info",
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        }
    }).showToast();
}

function changeConfigWithValue(key, value) {
    let _config = JSON.parse(localStorage.getItem(DEFAULT_CONFIG_KEY))

    _config[key] = value

    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(_config))

    config()
}

export { config, CONFIG, getConfigWithKey, resetConfig, changeConfig, changeConfigWithValue }