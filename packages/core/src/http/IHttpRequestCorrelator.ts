/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Correlation service that can provide or forward an ID
 * that will be injected both in HTTP requests and log events,
 * using plugins and middlewares.
 *
 * @remarks
 * You can use the {HttpRequestCorrelator} implementation only if you're running
 * NodeJS 13.10 or later.
 *
 * If you're running an older version of NodeJS, you can still implement this interface easily
 * using the cls-hooked module
 * (@see https://nodejs.org/api/async_hooks.html#async_hooks_new_asynclocalstorage).
 *
 * Example:
 * ```ts
 *  import * as cls from 'cls-hooked';
 * import { EventEmitter } from 'events';
 * import { IHttpRequestCorrelator } from './IHttpRequestCorrelator';
 * class CustomHttpRequestCorrelator implements IHttpRequestCorrelator {
 *   private store: cls.Namespace = cls.createNamespace('__CustomHttpRequestCorrelator__');
 *
 *   public withId(work: () => void, cid?: string): void {
 *     this.store.run(() => {
 *       this.store.set('cid', cid);
 *       work();
 *     });
 *   }
 *
 *   public getId() {
 *     return this.store.get('cid');
 *   }
 *
 *   public bindEmitter(emitter: EventEmitter) {
 *     this.store.bindEmitter(emitter);
 *   }
 * }
 * ```
 */
export interface IHttpRequestCorrelator {
  /**
   * gets the current correlation ID
   */
  getId(): string | undefined;

  /**
   * Starts a new context and installs the submitted correlation ID (or generates a new one
   * if undefined), then invokes the submitted callback.
   * @param work a callback to invoke with the submitted correlation ID
   * @param cid the correlation ID to install be before invoking the submitted callback
   */
  withId(work: () => void, cid?: string): void;

  /**
   * Starts a new context and installs the submitted correlation ID (or generates a new one
   * if undefined), then invokes the submitted callback.
   * This is the promisified version of the `withId` method.
   * @param work a callback to invoke with the submitted correlation ID
   * @param cid the correlation ID to install be before invoking the submitted callback
   */
  withIdAsync(work: () => Promise<void>, cid?: string): Promise<void>;

  /**
   * binds the current correlation context to the target
   * @param target the target to bind to
   * @returns either the submitted target (if it is an emitter) or a wrapped target (for a function)
   * @remarks you might have to bind to an emitter in order to maitain
   * the correlation context.
   */
  bind<T>(target: T): T;
}
