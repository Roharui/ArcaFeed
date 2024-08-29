
import { changeConfig, CONFIG, resetConfig } from "../config";
import { Vault } from "../vault";
import { EVENT_TYPE } from "../vault/eventType";
import { nextComment, prevComment } from "./comment";
import { hideViewer, moveDown, moveUp, nextImage, prevImage, showViewer, widthFit } from "./image"
import { clickCursor, createCursor, cursorMoveDown, cursorMoveLeft, cursorMoveRight, cursorMoveUp, removeCursor } from "./mouse";
import { nextPage, prevPage } from "./next";
import { scrap } from "./scrap";

const CONTROL = "CONTROL"
const NORMAL = "NORMAL"

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
}

const VIEWER_EVENT = {
    "ArrowLeft": prevImage,
    "ArrowRight": nextImage,
    "ArrowDown": moveDown,
    "ArrowUp": moveUp,
    "/": widthFit,
    "Shift": hideViewer,
}

const MOUSE_EVENT = {
    "ArrowLeft": cursorMoveLeft,
    "ArrowRight": cursorMoveRight,
    "ArrowDown": cursorMoveDown,
    "ArrowUp": cursorMoveUp,
    "Enter": clickCursor,
    "Shift": removeCursor,
}

const EVENT = {
    [EVENT_TYPE.DEFAULT]: {
        [CONTROL]: CONTROL_KEYBORD_EVENT,
        [NORMAL]: KEYBORD_EVENT
    },
    [EVENT_TYPE.VIEWER]: {
        [CONTROL]: {},
        [NORMAL]: VIEWER_EVENT
    },
    [EVENT_TYPE.MOUSE]: {
        [CONTROL]: {},
        [NORMAL]: MOUSE_EVENT
    }
}

function event() {
    $(document).on("keydown", function(e) {
        let v = new Vault()

        const E = EVENT[v.getEventType()]

        const C = E[CONTROL]
        const N = E[NORMAL]

        const F = (e.ctrlKey ? C : N)[e.key]

        if (F == undefined) return;

        F(e);
    })
}

export { event }