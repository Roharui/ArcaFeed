import { createCursor } from "../mouse/mouse"
import { showViewer } from "../viewer"
import { nextPageConfigModal, initConfigModal } from "./modal"
import { nextPage, prevPage } from "./next"
import { scrap } from "./scrap"
import { clearSeries } from "./series"


const CONTROL_KEYBORD_EVENT = {
    "ArrowLeft": () => history.back(),
    "ArrowRight": () => history.forward(),
    "0": () => nextPageConfigModal()
}

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "Shift": showViewer,
    "`": () => initConfigModal(),
    ".": scrap,
    "'": createCursor,
    ";": clearSeries
}

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT }