
import { resetConfig } from "../config";
import { toggle, view } from "./image"
import { nextPage, prevPage } from "./next";

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "Enter": () => $('html, body').animate({scrollTop: $("#comment").offset().top}, 200),
    "Shift": view,
    "/": toggle,
    "\\": resetConfig
}

function event() {
    $(document).on("keyup", function(e) {
        if (KEYBORD_EVENT[e.key] == undefined) return;
        KEYBORD_EVENT[e.key]()
    })
}

export { event }