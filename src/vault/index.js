
class Vault {
    static instance = null;

    constructor() {
        if (Vault.instance) return Vault.instance;
        this.viewer = false;
        this.widthToggle = false;
        this.currentComment = null;
        Vault.instance = this;
    }
}

export { Vault }