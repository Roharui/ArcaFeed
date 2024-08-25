
import { Vault } from "../vault";

function enableFullscreen() {
    if (new Vault().viewer) {
        return;
    }

    var elem = document.documentElement;
    var rfs = elem.requestFullscreen
        || elem.webkitRequestFullScreen
        || elem.mozRequestFullScreen
        || elem.msRequestFullScreen;
    rfs.call(elem);
}

function disableFullScreen() {
    let isFullscreen = (
        (document.fullscreenElement && document.fullscreenElement !== null) ||
        (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
        (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
        (document.msFullscreenElement && document.msFullscreenElement !== null)
    )

    if (isFullscreen) {
        const cancellFullScreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
        cancellFullScreen.call(document);
    }
}

export { enableFullscreen, disableFullScreen }