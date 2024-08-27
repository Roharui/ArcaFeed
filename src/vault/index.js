
class Vault {
    static instance = null;

    constructor() {
        if (Vault.instance) return Vault.instance;
        this.gallery = null;
        this.widthToggle = false;
        this.currentComment = null;
        Vault.instance = this;
    }

    isViewer() {
        let gallery = this.gallery
        if (gallery === null) return false;
        return gallery.showing || gallery.isShown || gallery.showing
    }
}

export { Vault }