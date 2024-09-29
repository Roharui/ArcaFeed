
import Toastify from 'toastify-js'

import { viewInit } from '../event/viewer';
import { seriesInit } from '../event/nomal/series';

const DEFAULT_CONFIG_KEY = "arcalive_tampermonkey_config"

const CONFIG = {
    DEFAULT_COMMENT_HIDE: "default_comment_hide",
    DEFAULT_RIGHT_SIDEBAR_HIDE: "default_right_sidebar_hide",
    DEFAULT_VIEWER: "default_viewer",
    DEFAULT_WIDTHFIT: "default_widthfit",
    NEXT_PAGE_INCLUDE: "next_page_include",
    NEXT_PAGE_EXCLUDE: "next_page_exclude"
}

const DEFAULT_CONFIG = {
    default_comment_hide: false,
    default_right_sidebar_hide: true,
    default_viewer: false,
    default_widthfit: false,
    next_page_include: "",
    next_page_exclude: ""
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

    if (config.default_comment_hide) {
        $("#comment").hide()
    }
    if (config.default_right_sidebar_hide) {
        $(".right-sidebar").hide()
    }

    viewInit(config.default_viewer, config.default_widthfit)
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

    _config[key] = value ?? ""

    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(_config))

    config()
}

export { config, CONFIG, getConfigWithKey, resetConfig, changeConfig, changeConfigWithValue }