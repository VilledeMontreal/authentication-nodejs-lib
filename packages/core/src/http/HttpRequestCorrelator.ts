/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { EventEmitter } from 'events';
import { IHttpRequestCorrelator } from './IHttpRequestCorrelator';
import { TypedProperty } from '../types/TypedProperty';

const { AsyncLocalStorage } = require('async_hooks');

const oldEmitProperty = new TypedProperty<any, EventEmitter>(Symbol('oldEmit'));
const storeProperty = new TypedProperty<any, any>(Symbol('cidStore'));

/**
 * Correlation service that can provide or forward an ID
 * that will be injected both in HTTP requests and log events,
 * using plugins and middlewares.
 * @remarks
 * This service only works with NodeJS 13.10 or later since it relies
 * on the new {AsyncLocalStorage} class, from the async_hooks module.
 * We don't provide an alternate implementation since we don't want
 * to introduce any external dependency to this project.
 * @see https://nodejs.org/api/async_hooks.html#async_hooks_new_asynclocalstorage
 *
 * See also the documentation of the {IHttpRequestCorrelator} for a concrete
 * example of such an implementation.
 */
export class HttpRequestCorrelator implements IHttpRequestCorrelator {
  private readonly storage: any;

  private nextId = 0;

  /**
   * Creates a new instance of a {HttpRequestCorrelator}
   * @param [idGenerator] an optional custom ID generator
   */
  constructor(private readonly idGenerator?: () => string) {
    this.storage = createAsyncLocalStorage(AsyncLocalStorage);
  }

  /**
   * Generates a new ID for correlating multiple HTTP requests.
   *
   * If a custom generator was not provided in the constructor,
   * a default ID will be generated, without any warranty of its unicity
   * (format is 'CID-<index>'). Note that we don't generate a Guid because
   * we don't want add any external dependency to this library.
   * @remarks
   * Note that if you provide explicitely a Correlation ID to the
   * `withId` or `withIdAsync` methods, `createNewId` won't be called.
   */
  public createNewId(): string {
    if (this.idGenerator) {
      return this.idGenerator();
    }
    this.nextId += 1;
    return `CID-${this.nextId}`;
  }

  /**
   * gets the current correlation ID
   */
  public getId(): string | undefined {
    const store = this.storage.getStore();
    if (store) {
      return store.correlationId;
    }
    return undefined;
  }

  /**
   * Starts a new context and installs the submitted correlation ID (or generates a new one
   * if undefined), then invokes the submitted callback.
   * @param work a callback to invoke with the submitted correlation ID
   * @param [cid] the correlation ID to install be before invoking the submitted callback
   */
  public withId(work: () => void, cid?: string): void {
    const correlationId = cid || this.createNewId();
    this.storage.enterWith({ correlationId });
    work();
  }

  /**
   * Starts a new context and installs the submitted correlation ID (or generates a new one
   * if undefined), then invokes the submitted callback.
   * This is the promisified version of the `withId` method.
   * @param work a callback to invoke with the submitted correlation ID
   * @param [cid] the correlation ID to install be before invoking the submitted callback
   */
  public async withIdAsync(
    work: () => Promise<void>,
    cid?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.withId(() => {
        work().then(resolve).catch(reject);
      }, cid);
    });
  }

  public bind<T>(target: T): T {
    if (target instanceof EventEmitter) {
      return this.bindEmitter(target);
    }
    if (typeof target === 'function') {
      return this.bindFunction(target);
    }
    return target;
  }

  private bindEmitter<T extends EventEmitter>(emitter: T): T {
    // patch emit method only once!
    const emitterObj = emitter as any;
    if (oldEmitProperty.isUndefined(emitterObj)) {
      oldEmitProperty.set(emitterObj, emitter.emit);
      emitterObj.emit = (...args: any[]) => {
        // use the store that was bound to this emitter
        const store = storeProperty.get(emitter);
        if (store) {
          this.storage.enterWith(store);
        }
        // invoke original emit method
        oldEmitProperty.get(emitterObj).call(emitter, ...args);
      };
    }
    // update the store bound to the emitter
    storeProperty.set(emitterObj, this.storage.getStore());
    return emitter;
  }

  private bindFunction<T extends Function>(target: T): T {
    const { storage } = this;
    const store = this.storage.getStore();
    return function correlatorWrapper(this: any, ...args: any[]) {
      storage.enterWith(store);
      return target.call(this, ...args);
    } as any;
  }
}

let warningDelivered = false;
export function createAsyncLocalStorage(ctor: any) {
  if (ctor) {
    // eslint-disable-next-line new-cap
    return new ctor();
  }
  if (!warningDelivered) {
    warningDelivered = true;
    const msg = `Could not find AsyncLocalStorage class in async_hooks module.
This is probably because you're running a version of node prior to 13.10.
Note that the correlation feature will be disabled.`;
    // eslint-disable-next-line no-console
    console.warn(msg);
  }
  let store: any;
  return {
    getStore() {
      return store;
    },
    run(aStore: any, callback: any, ...args: any[]) {
      callback(...args);
    },
    enterWith(aStore: any) {
      store = aStore;
    },
    exit(callback: any, ...args: any[]) {
      store = undefined;
      callback(...args);
    },
  };
}
