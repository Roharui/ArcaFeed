
import { resetConfig } from "../config";
import { nextComment, prevComment } from "./comment";
import { disableFullScreen, enableFullscreen } from "./fullscreen";
import { toggle, view } from "./image"
import { nextPage, prevPage } from "./next";

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "ArrowDown": enableFullscreen,
    "Enter": nextComment,
    "Shift": view,
    "/": toggle,
    "\\": disableFullScreen,
    "`": () => resetConfig(),
}

const CONTROL_KEYBORD_EVENT = {
    "Enter": prevComment,
    "ArrowLeft": () => history.back(),
    "ArrowRight": () => history.forward(),
}

function event() {
    $(document).on("keydown", function(e) {
        console.log(e.key)
        if (KEYBORD_EVENT[e.key] == undefined) return;
        if (e.ctrlKey) {
            CONTROL_KEYBORD_EVENT[e.key]()
        } else {
            KEYBORD_EVENT[e.key]()
        }
    })
}

export { event }