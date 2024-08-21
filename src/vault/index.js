
class Vault {
    static instance = null;

    constructor() {
        if (Vault.instance) return Vault.instance;
        this.viewer = false
        Vault.instance = this;
    }
}

export { Vault }