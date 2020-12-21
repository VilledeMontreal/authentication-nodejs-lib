/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * The arguments required to create a new instance of a SynchronizedAsyncValue class.
 */
export interface ISynchronizedAsyncValueArgs<T> {
  /**
   * gets the current value or returns undefined if there is none.
   */
  getter: () => Promise<T | undefined>;

  /**
   * sets the new current value
   */
  setter: (value: T) => Promise<void>;

  /**
   * resolver used to dynamically provide the value
   * when it has not been cached yet.
   */
  resolver: (previousValue?: T) => Promise<T>;

  /**
   * validator that will accept or reject the cached value
   * (because it has expired for instance)
   */
  validator?: (value: T) => boolean;
}

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
 * The evaluated value returned by the resolver will be cached using the getter/setter callbacks
 * until the optional validator rejects it (because it has expired for instance).
 */
export class SynchronizedAsyncValue<T> {
  private readonly getter: () => Promise<T | undefined>;

  private readonly setter: (value: T) => Promise<void>;

  private readonly resolver: (previousValue?: T) => Promise<T>;

  private readonly validator?: (value: T) => boolean;

  private resolverCall?: Promise<T>;

  /**
   * creates a new instance of a SynchronizedAsyncValue
   * @param args the arguments required by the SynchronizedAsyncValue class
   */
  constructor(args: ISynchronizedAsyncValueArgs<T>) {
    this.getter = args.getter;
    this.setter = args.setter;
    this.resolver = args.resolver;
    this.validator = args.validator;
  }

  /**
   * gets the current value.
   * If there is none or if the validator rejects the current value,
   * it will trigger the resolver.
   * @param forceResolve when true, it will force the invocation of the resolver,
   *                     even if the cached value is still valid.
   */
  public async getValue(forceResolve = false): Promise<T> {
    const value = await this.getter();
    if (value !== undefined && !forceResolve) {
      const isCachedValueStillValid = !this.validator || this.validator(value);
      if (isCachedValueStillValid) {
        return value;
      }
    }
    if (this.resolverCall) {
      return this.resolverCall;
    }
    this.resolverCall = this.resolver(value);
    try {
      const newValue = await this.resolverCall;
      await this.setter(newValue);
      return newValue;
    } finally {
      this.resolverCall = undefined;
    }
  }
}
