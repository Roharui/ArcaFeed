
import { resetConfig } from "../config";
import { disableFullScreen, enableFullscreen } from "./fullscreen";
import { toggle, view } from "./image"
import { nextComment, nextPage, prevComment, prevPage } from "./next";

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "ArrowDown": enableFullscreen,
    "Enter": () => {
        $('html, body').animate({scrollTop: $("#comment").offset().top}, 200)
    },
    "Shift": view,
    "/": toggle,
    "\\": disableFullScreen,
    "~": () => {}
}

const CONTROL_KEYBORD_EVENT = {
    "ArrowLeft": prevComment,
    "ArrowRight": nextComment,
    "~": () => resetConfig(),
}

function event() {
    $(document).on("keyup", function(e) {
        if (KEYBORD_EVENT[e.key] == undefined) return;
        if (e.ctrlKey) {
            CONTROL_KEYBORD_EVENT[e.key]()
        } else {
            KEYBORD_EVENT[e.key]()
        }
    })
}

export { event }