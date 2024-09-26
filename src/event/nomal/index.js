import { CONFIG, changeConfig } from "../../config"
import { createCursor } from "../mouse/mouse"
import { showViewer } from "../viewer"
import { nextComment, prevComment } from "./comment"
import { nextPage, prevPage } from "./next"
import { scrap } from "./scrap"
import { clearSeries } from "./series"


const CONTROL_KEYBORD_EVENT = {
    "Enter": prevComment,
    "ArrowLeft": () => history.back(),
    "ArrowRight": () => history.forward(),
    "\\": () => changeConfig(CONFIG.DEFAULT_VIEWER),
    "/": () => changeConfig(CONFIG.DEFAULT_WIDTHFIT),
}

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "Enter": nextComment,
    "Shift": showViewer,
    "`": () => resetConfig(),
    ".": scrap,
    "'": createCursor,
    ";": clearSeries,
}

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT }