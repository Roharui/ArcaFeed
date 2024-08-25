
import { resetConfig } from "../config";
import { nextComment, prevComment } from "./comment";
import { enableFullscreen, isFullscreen } from "./fullscreen";
import { toggle, view } from "./image"
import { nextPage, prevPage } from "./next";

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "Enter": nextComment,
    "Shift": view,
    "/": toggle,
    "`": () => resetConfig(),
}

const CONTROL_KEYBORD_EVENT = {
    "Enter": prevComment,
    "ArrowLeft": () => history.back(),
    "ArrowRight": () => history.forward(),
}

function event() {
    $(document).on("keydown", function(e) {
        if (KEYBORD_EVENT[e.key] == undefined) return;
        if (e.ctrlKey) {
            CONTROL_KEYBORD_EVENT[e.key]()
        } else {
            KEYBORD_EVENT[e.key]()
        }
    })
    $(document).on("keyup", function(e) {
        if (e.key === "Shift" && !isFullscreen()) {
            enableFullscreen()
        }
    })
}

export { event }