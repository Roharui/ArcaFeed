import { EVENT_TYPE } from "./eventType";

class Vault {
    static instance = null;

    constructor() {
        if (Vault.instance) return Vault.instance;
        this.gallery = null;
        this.eventType = EVENT_TYPE.DEFAULT
        this.currentComment = null;
        this.cursor = null;
        Vault.instance = this;
    }

    getCursor() {
        return this.cursor
    }

    setCursor(cursor) {
        this.cursor = cursor
    }

    removeCursor() {
        this.cursor = null
        this.cursorLoc = null
    }

    getCursorLoc() {
        if (this.cursorLoc == null) {
            let left = parseInt(window.innerWidth / 2)
            let top = parseInt(window.innerHeight / 2)

            this.cursorLoc = {left, top}
        }

        return this.cursorLoc
    }

    setGallery(gallery) {
        this.gallery = gallery
    }

    runViewer(f) {
        if (this.gallery == null) return;
        f(this.gallery)
    }

    getEventType() {
        let gallery = this.gallery
        if (gallery !== null && (gallery.showing || gallery.isShown || gallery.showing)) return EVENT_TYPE.VIEWER
        return this.eventType
    }
}

export { Vault }