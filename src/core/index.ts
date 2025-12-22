import { EventManager } from './event';

import type { MethodKeys, PromiseFunc } from '@/types';

class ArcaFeed extends EventManager {
  private static instance: ArcaFeed;

  constructor() {
    super();
    ArcaFeed.instance = this;
  }

  private static getInstance(): ArcaFeed {
    return ArcaFeed.instance ?? new ArcaFeed();
  }

  static isDev(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static log(...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ArcaFeed]', ...args);
    }
  }

  static async runEvent(eventName: MethodKeys<EventManager>) {
    const func = ArcaFeed.getInstance()[eventName] as Function;

    func.apply(ArcaFeed.getInstance());
    await ArcaFeed.getInstance().initPromise();
  }

  static async runPromise(...func: PromiseFunc[]) {
    ArcaFeed.getInstance().addNextPromise(...func);
    await ArcaFeed.getInstance().initPromise();
  }
}

export { ArcaFeed };
