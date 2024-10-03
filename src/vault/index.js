import { CONFIG, getConfigWithKey } from "../config";
import { getNextPageUrl, getPrevPageUrl } from "../event/nomal/next";
import { fetchPage } from "../utils/link";
import { EVENT_TYPE } from "./eventType";

class Vault {
    static instance = null;

    constructor() {
        if (Vault.instance) return Vault.instance;
        this.gallery = null;
        this.eventType = EVENT_TYPE.DEFAULT
        this.currentComment = null;
        this.cursor = null;

        this.nextPageUrl = null;
        this.nextPageHtml = null;
        this.prevPageUrl = null;
        this.prevPageHtml = null;

        Vault.instance = this;
    }

    clear() {
        Vault.instance = null;
    }

    pullPage() {
        if (!location.pathname.includes("/b/")) {
            return;
        }

        this.nextPageUrl = getNextPageUrl()
        this.prevPageUrl = getPrevPageUrl()

        if (getConfigWithKey(CONFIG.NO_REFRESH)) {
            fetchPage(this.nextPageUrl, (html) => new Vault().setNextPageHtml(html))
            fetchPage(this.prevPageUrl, (html) => new Vault().setPrevPageHtml(html))
        }
    }

    setNextPageHtml(html) {
        this.nextPageHtml = html
    }

    setPrevPageHtml(html) {
        this.prevPageHtml = html
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

    setCursorLoc(loc) {
        this.cursorLoc = loc
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
        if ($('#dialog').length) return EVENT_TYPE.MODAL
        return this.eventType
    }
}

export { Vault }