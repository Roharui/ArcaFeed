
import { Vault } from "@vault";
import { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT } from "./default";
import { VIEWER_EVENT } from "./viewer";

const EVENT_TYPE = {
    DEFAULT: "DEFAULT",
    VIEWER: "VIEWER"
}

const CONTROL = "CONTROL"
const NORMAL = "NORMAL"

const EVENT = {
    [EVENT_TYPE.DEFAULT]: {
        [CONTROL]: CONTROL_KEYBORD_EVENT,
        [NORMAL]: KEYBORD_EVENT
    },
    [EVENT_TYPE.VIEWER]: {
        [CONTROL]: {},
        [NORMAL]: VIEWER_EVENT
    },
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