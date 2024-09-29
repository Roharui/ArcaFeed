import { createCursor } from "../mouse/mouse"
import { showViewer } from "../viewer"
import { nextComment, prevComment } from "./comment"
import { nextPageConfigModal, initConfigModal } from "./modal"
import { nextPage, prevPage } from "./next"
import { scrap } from "./scrap"
import { clearSeries } from "./series"


const CONTROL_KEYBORD_EVENT = {
    "Enter": prevComment,
    "ArrowLeft": () => history.back(),
    "ArrowRight": () => history.forward(),
    "0": () => nextPageConfigModal()
}

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "Enter": nextComment,
    "Shift": showViewer,
    "`": () => initConfigModal(),
    ".": scrap,
    "'": createCursor,
    ";": clearSeries
}

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT }