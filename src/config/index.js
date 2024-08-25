
const DEFAULT_CONFIG_KEY = "arcalive_tampermonkey_config"

const DEFAULT_CONFIG = {
    default_comment_hide: false,
    default_right_sidebar_hide: true,
}

function init() {
    $('head').append('<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.6/viewer.min.css">');
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

}

function resetConfig() {
    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    config()
}

function changeConfig(key) {
    let _config = JSON.parse(localStorage.getItem(DEFAULT_CONFIG_KEY))

    _config[key] = !_config[key]

    localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(_config))

    config()
}

export { init, resetConfig, changeConfig }