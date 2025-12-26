import { Vault } from '@/vault';

class Base {
  p: Vault;

  constructor() {
    this.p = new Vault();
  }
}

export { Base };
