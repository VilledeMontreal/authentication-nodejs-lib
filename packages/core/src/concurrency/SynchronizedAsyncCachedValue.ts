/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { SynchronizedAsyncValue } from './SynchronizedAsyncValue';

// tslint:disable: object-shorthand-properties-first
/**
 * A class used to synchronize the invocation of the asynchronous resolver,
 * to avoid triggering the same request multiple times for the same action.
 * For instance, it will make sure that we ask for a new access token only once,
 * even when there are concurrent calls.
 *
 * The initial call will create a promise on the resolver,
 * keep a reference to the promise until it completes,
 * and it will simply return the current promise to concurrent calls.
 *
 * The evaluated value returned by the resolver will be cached in the instance
 * until the optional validator rejects it (because it has expired for instance).
 */
export class SynchronizedAsyncCachedValue<T> extends SynchronizedAsyncValue<T> {
  private value?: T;

  /**
   * creates a new instance of the SynchronizedAsyncCachedValue
   * @param resolver your callback that will dynamically provide the value.
   * @param [validator] your optional callback that will tell if the cached value is expired or not.
   */
  constructor(
    resolver: (previousValue?: T) => Promise<T>,
    validator?: (value: T) => boolean,
  ) {
    super({
      getter: () => Promise.resolve(this.value),
      setter: (value: T) => {
        this.value = value;
        return Promise.resolve();
      },
      resolver,
      validator,
    });
  }

  /**
   * gets the cached value or returns undefined
   */
  public getCachedValue() {
    return this.value;
  }

  /**
   * clears the cached value.
   * The next call to getValue will invoke the resolver.
   */
  public reset() {
    this.value = undefined;
  }
}
