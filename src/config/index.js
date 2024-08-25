
import Toastify from 'toastify-js'
import { Vault } from "../vault";

const DEFAULT_CONFIG_KEY = "arcalive_tampermonkey_config"

const DEFAULT_CONFIG = {
    default_comment_hide: false,
    default_right_sidebar_hide: true,
    default_widthfit: false,
}

function init() {
    $('head').append('<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.6/viewer.min.css">');
    $('head').append('<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">');
    
    config()
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

    new Vault().widthToggle = config.default_widthfit

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
}

export { init, resetConfig, changeConfig }