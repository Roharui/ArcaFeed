import { Config, Vault, type Param } from "@/vault";

class Base {
  p: Param;

  constructor() {
    const v = new Vault();
    const c = new Config();

    this.p = { v, c }
  }
}

export { Base }
