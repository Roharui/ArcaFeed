
import { toggle, view } from "./image"
import { nextPage, prevPage } from "./next";

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage, 
    "ArrowRight": nextPage, 
    "Enter": () => $("#comment").toggle(),
    "Shift": view,
    "/": toggle
}

function event() {
    $(document).on("keyup", function(e) {
        if (KEYBORD_EVENT[e.key] == undefined) return;
        KEYBORD_EVENT[e.key]()
    })
}

export { event }