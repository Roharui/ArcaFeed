export class PromiseManager {
  initPromise() {
    setTimeout(async () => {
      console.log('Promise Manager Start');
      console.log(this.promiseList);
      while (this.promiseList.length > 0) {
        const promiseFunc = this.promiseList.shift();
        await promiseFunc.call();
      }
    }, 1000);
  }
}
