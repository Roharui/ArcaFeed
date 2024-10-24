import { VaultArticle } from './article';
import { VaultBase } from './base';
import { mix } from './builder';
import { VaultGallery } from './gallery';

class Vault extends mix(VaultBase).with(VaultArticle, VaultGallery) {
  static instance = null;

  constructor() {
    if (Vault.instance) return Vault.instance;
    super();

    Vault.instance = this;
  }
}

export { Vault };
