import { createCursor } from "../mouse/mouse"
import { showViewer } from "../viewer"
import { nextPage, prevPage } from "./next"
import { scrap } from "./scrap"
import { clearSeries } from "./series"
import { voteUp } from "./vote"

const CONTROL_KEYBORD_EVENT = {
    "ArrowUp": () => voteUp()
}

const KEYBORD_EVENT = {
    "ArrowLeft": prevPage,
    "ArrowRight": nextPage,
    "Shift": showViewer,
    ".": scrap,
    "'": createCursor,
    ";": clearSeries
}

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT }