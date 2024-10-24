class MixinBuilder {
  constructor(superclass) {
    this.superclass = superclass;
  }
  with(...mixins) {
    return mixins.reduce((c, mixin) => mixin(c), this.superclass);
  }
}

// this will combine everything in one class
const mix = (superclass) => new MixinBuilder(superclass);

export { mix };
