import { sleep } from 'src/utils/sleep';

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
        try {
          await promiseFunc.call(this);
        } catch (e) {
          console.log(e);
          await sleep(1000);
          this.promiseListCurrent.unshift(promiseFunc);
        }
      }
      console.log('Promise End');
    }

    this.isActive = false;
  }

  rejectPromise() {
    this.promiseListCurrent = [];
    this.promiseList = [];
  }

  addPromiseCurrent(...promiseFuncList) {
    if (this.isActive) {
      this.promiseListCurrent.unshift(...promiseFuncList);
    } else {
      console.error(new Error('Promise is not active'));
    }
  }

  addNextPromise(promiseFuncList) {
    this.promiseList.push(promiseFuncList);
    setTimeout(() => this.initPromise(), 100);
  }
}
