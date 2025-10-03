import { Config, Vault } from "@/vault";

class Base {
  v: Vault;
  c: Config;

  constructor(v: Vault, c: Config) {
    this.v = v;
    this.c = c;
  }
}

export { Base }
