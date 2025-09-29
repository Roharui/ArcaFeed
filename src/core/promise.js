export class PromiseManager {
  isActive = false;

  async initPromise() {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Promise Start');
    while (this.promiseList.length > 0) {
      const promiseFunc = this.promiseList.shift();
      // console.log('Promise Execute:', promiseFunc);
      await promiseFunc.call(this);
    }
    this.isActive = false;
    console.log('Promise End');
  }
}
