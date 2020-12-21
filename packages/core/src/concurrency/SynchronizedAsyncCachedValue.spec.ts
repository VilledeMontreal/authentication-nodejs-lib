/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { delay } from '../time/delay';
import { SynchronizedAsyncCachedValue } from './SynchronizedAsyncCachedValue';

describe('SynchronizedAsyncCachedValue', () => {
  test('getValue() should resolve the value and cache it', async () => {
    // setup
    let counter = 0;
    const previousValues: any[] = [];
    const foo = new SynchronizedAsyncCachedValue(previous => {
      previousValues.push(previous);
      counter += 1;
      return Promise.resolve(counter);
    });
    expect(foo.getCachedValue()).toBeUndefined();
    // act
    const val = await foo.getValue();
    // expect
    expect(val).toBe(1);
    expect(foo.getCachedValue()).toBe(1);
    // asking getValue again should return the cached value
    expect(await foo.getValue()).toBe(1);
    // but asking getValue with forceResolve should produce a new value
    expect(await foo.getValue(true)).toBe(2);
    expect(previousValues).toEqual([undefined, 1]);
  });

  test('reset() should clear the cache', async () => {
    // setup
    let counter = 0;
    const previousValues: any[] = [];
    const foo = new SynchronizedAsyncCachedValue(previous => {
      previousValues.push(previous);
      counter += 1;
      return Promise.resolve(counter);
    });
    const val = await foo.getValue();
    expect(val).toBe(1);
    expect(foo.getCachedValue()).toBe(1);
    // act
    foo.reset();
    // expect
    expect(foo.getCachedValue()).toBeUndefined();
    // asking getValue should produce a new value after a reset
    expect(await foo.getValue(true)).toBe(2);
    expect(previousValues).toEqual([undefined, undefined]);
  });

  test('getValue() should resolve only once when called concurrently', async () => {
    // setup
    let counter = 0;
    const foo = new SynchronizedAsyncCachedValue(async previous => {
      await delay(25);
      counter += 1;
      return Promise.resolve(counter);
    });
    expect(foo.getCachedValue()).toBeUndefined();

    // act
    const pVal1 = foo.getValue();
    const pVal2 = foo.getValue();
    const val1 = await pVal1;
    const val2 = await pVal2;

    // expect
    expect(val1).toBe(1);
    expect(val2).toBe(1);
    expect(foo.getCachedValue()).toBe(1);
    // asking getValue again should return the cached value
    expect(await foo.getValue()).toBe(1);
    // but asking getValue with forceResolve should produce a new value
    expect(await foo.getValue(true)).toBe(2);
  });

  test('getValue() should resolve a new value when validator rejects the cached value', async () => {
    // setup
    let counter = 0;
    const previousValues: any[] = [];
    const foo = new SynchronizedAsyncCachedValue(
      previous => {
        previousValues.push(previous);
        counter += 1;
        return Promise.resolve(counter);
      },
      (value: number) => value >= 2,
    );
    expect(foo.getCachedValue()).toBeUndefined();
    // act
    const val = await foo.getValue();
    // expect
    expect(val).toBe(1);
    expect(foo.getCachedValue()).toBe(1);
    // asking getValue again should return a return a new value
    // because the validator will reject the value
    expect(await foo.getValue()).toBe(2);
    // asking getValue again should return the cached value because
    // the cached value is accepted by the validator
    expect(await foo.getValue()).toBe(2);
    // but asking getValue with forceResolve should produce a new value
    expect(await foo.getValue(true)).toBe(3);
    expect(previousValues).toEqual([undefined, 1, 2]);
  });
});
