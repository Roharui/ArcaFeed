export class PromiseManager {
  initPromise() {
    setTimeout(async () => {
      while (this.promiseList.length > 0) {
        const promiseFunc = this.promiseList.shift();
        await promiseFunc.call();
      }
    }, 10);
  }
}
