
import { Vault } from "../vault";
import { EVENT_TYPE } from "../vault/eventType";
import { MOUSE_EVENT } from "./mouse";
import { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT } from "./nomal";
import { VIEWER_EVENT } from "./viewer";

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