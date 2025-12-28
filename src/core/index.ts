import { EventManager } from './event';

import type { MethodKeys } from '@/types';

class ArcaFeed extends EventManager {
  private static instance: ArcaFeed;

  constructor() {
    super();
    ArcaFeed.instance = this;
  }

  private static getInstance(): ArcaFeed {
    return ArcaFeed.instance ?? new ArcaFeed();
  }

  static async runEvent(eventName: MethodKeys<EventManager>) {
    const func = ArcaFeed.getInstance()[eventName] as Function;

    func.apply(ArcaFeed.getInstance());
    await ArcaFeed.getInstance().initPromise();
  }
}

export { ArcaFeed };
