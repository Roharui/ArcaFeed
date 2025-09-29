export class PromiseManager {
  promiseListCurrent = [];
  promiseList = [];
  isActive = false;

  async initPromise() {
    if (this.isActive) return;

    this.isActive = true;
    while (this.promiseList.length > 0) {
      console.log('Promise Start');
      this.promiseListCurrent = this.promiseList.shift();
      while (this.promiseListCurrent.length > 0) {
        const promiseFunc = this.promiseListCurrent.shift();
        if (typeof promiseFunc === 'function') await promiseFunc.call(this);
        else if (promiseFunc instanceof Promise) await promiseFunc;
      }
      this.isActive = false;
      console.log('Promise End');
    }
  }

  addPromiseCurrent(...promiseFuncList) {
    if (this.isActive) {
      this.promiseListCurrent.unshift(...promiseFuncList);
    } else {
      console.log('Warning: No active promise to add to current list.');
    }
  }

  addNextPromise(promiseFuncList) {
    this.promiseList.push(promiseFuncList);
    setTimeout(() => this.initPromise(), 100);
  }
}
