/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { EventEmitter } from 'events';
import { IHttpRequestCorrelator } from './IHttpRequestCorrelator';

/**
 * Fake implementation of a IHttpRequestCorrelator for unit tests.
 */
export class FakeHttpRequestCorrelator implements IHttpRequestCorrelator {
  private readonly idStack: (string | undefined)[] = [];

  constructor(initialValue?: string) {
    if (initialValue) {
      this.idStack.push(initialValue);
    }
  }

  /**
   * the list of emitters that were bound
   */
  emitters: any[] = [];

  /**
   * the list of functions that were bound
   */
  functions: any[] = [];

  /**
   * gets the current correlation ID
   */
  getId(): string | undefined {
    if (this.idStack.length > 0) {
      return this.idStack[this.idStack.length - 1];
    }
    return undefined;
  }

  /**
   * binds the current correlation context to the target
   * @param target the target to bind to
   * @returns either the submitted target (if it is an emitter) or a wrapped target (for a function)
   * @remarks you might have to bind to an emitter in order to maitain
   * the correlation context.
   */
  bind<T>(target: T): T {
    if (target instanceof EventEmitter) {
      this.emitters.push(target);
    }
    if (typeof target === 'function') {
      this.functions.push(target);
    }
    return target;
  }

  /**
   * Executes a function inside a context where the correlation ID is defined.
   *
   * @param work the function to run within the cid context.
   * @param [cid] the correlation ID to use.
   */
  withId(work: () => void, cid?: string): void {
    this.idStack.push(cid);
    try {
      work();
    } finally {
      this.idStack.pop();
    }
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
    this.idStack.push(cid);
    try {
      await work();
    } finally {
      this.idStack.pop();
    }
  }
}
