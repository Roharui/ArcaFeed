import { toPage } from "../../utils/toPage"

const CONTROL_KEYBORD_EVENT = {}

const KEYBORD_EVENT = {
    "ArrowLeft": () => toPage(false), 
    "ArrowRight": () => toPage(true), 
}

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT }