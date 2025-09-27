export class PromiseManager {
  initPromise() {
    setTimeout(() => {
      Promise.all(this.promiseList.map(([func, arg]) => func(arg)))
        .then(() => {
          if (process.env.NODE_ENV === 'development') console.log(this);
        })
        .catch((e) => {
          console.error(e);
        });
    }, 10);
  }
}
