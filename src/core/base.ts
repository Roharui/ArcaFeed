import { Config, Vault, type Param } from "@/vault";

class Base {
  p: Param;

  constructor() {
    this.p = {
      v: new Vault(),
      c: new Config(),
    }
  }
}

export { Base }
