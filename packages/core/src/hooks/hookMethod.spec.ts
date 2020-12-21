/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { delay } from '../time/delay';
import { hookMethod } from './hookMethod';

class Foo {
  public barCalled: boolean = false;

  public barHooked: boolean = false;

  public bar(callback: (err: any, a: number) => void) {
    this.barCalled = true;
    callback(undefined, 33);
  }
}

describe('hookMethod', () => {
  test('simple hook - success ', async () => {
    // setup
    let onResolve: (value?: unknown) => void;
    let onReject: (value?: unknown) => void;
    const myPromise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });
    const foo = new Foo();
    const originalBar = foo.bar;
    // act
    hookMethod(foo, 'bar', async args => {
      await delay(10);
      foo.barHooked = true;
    });
    foo.bar((err: any, a: number) => {
      if (err) {
        onReject(err);
      } else {
        onResolve(a);
      }
    });
    // expect
    expect(await myPromise).toBe(33);
    expect(foo.barCalled).toBeTruthy();
    expect(foo.barHooked).toBeTruthy();
    expect(foo.bar).not.toBe(originalBar);
  });

  test('simple hook - error ', async () => {
    // setup
    let onResolve: (value?: unknown) => void;
    let onReject: (value?: unknown) => void;
    const myPromise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });
    const foo = new Foo();
    expect.assertions(3);
    // act
    hookMethod(foo, 'bar', async args => {
      await delay(10);
      foo.barHooked = true;
      const err = new Error('test');
      const [callback] = args.methodArgs;
      callback(err);
      throw err;
    });
    foo.bar((err: any, a: number) => {
      if (err) {
        onReject(err);
      } else {
        onResolve(a);
      }
    });
    // expect
    await expect(myPromise).rejects.toThrow('test');
    expect(foo.barCalled).toBeFalsy();
    expect(foo.barHooked).toBeTruthy();
  });

  test('hook success without invoking original method', async () => {
    // setup
    let onResolve: (value?: unknown) => void;
    let onReject: (value?: unknown) => void;
    const myPromise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });
    const foo = new Foo();
    // act
    hookMethod(foo, 'bar', async args => {
      // eslint-disable-next-line no-param-reassign
      args.invokeHookedMethod = false;
      foo.barHooked = true;
      const [callback] = args.methodArgs;
      await delay(10);
      callback(undefined, 22);
    });
    foo.bar((err: any, a: number) => {
      if (err) {
        onReject(err);
      } else {
        onResolve(a);
      }
    });
    // expect
    expect(await myPromise).toBe(22);
    expect(foo.barCalled).toBeFalsy();
    expect(foo.barHooked).toBeTruthy();
  });

  test('throw an error if the method to be hooked does not exist ', async () => {
    // setup
    const foo = new Foo();
    expect.assertions(1);
    // act
    expect(() =>
      hookMethod(foo, 'unknown', async args => {
        await delay(10);
        foo.barCalled = true;
      }),
    ).toThrow("Method 'unknown' does not exist!");
  });

  test('an already hooked method should throw an error ', async () => {
    // setup
    const foo = new Foo();
    expect.assertions(1);
    // act
    hookMethod(foo, 'bar', async args => {
      await delay(10);
      foo.barCalled = true;
      const err = new Error('test');
      const [callback] = args.methodArgs;
      callback(err);
      throw err;
    });
    expect(() =>
      hookMethod(foo, 'bar', async args => {
        await delay(10);
        foo.barCalled = true;
        const err = new Error('test');
        const [callback] = args.methodArgs;
        callback(err);
        throw err;
      }),
    ).toThrow("Method 'bar' has already been hooked!");
  });

  test('restore hook - success ', async () => {
    // setup
    let onResolve: (value?: unknown) => void;
    let onReject: (value?: unknown) => void;
    const myPromise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });
    const foo = new Foo();
    const originalBar = foo.bar;
    // act
    hookMethod(foo, 'bar', async args => {
      await delay(10);
      foo.barCalled = true;
      // eslint-disable-next-line no-param-reassign
      args.restoreHookedMethod = true;
    });
    foo.bar((err: any, a: number) => {
      if (err) {
        onReject(err);
      } else {
        onResolve(a);
      }
    });
    // expect
    expect(await myPromise).toBe(33);
    expect(foo.barCalled).toBeTruthy();
    expect(foo.bar).toBe(originalBar);
  });

  test('restore hook - error ', async () => {
    // setup
    let onResolve: (value?: unknown) => void;
    let onReject: (value?: unknown) => void;
    const myPromise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });
    const foo = new Foo();
    const originalBar = foo.bar;
    // act
    hookMethod(foo, 'bar', async args => {
      // eslint-disable-next-line no-param-reassign
      args.restoreHookedMethod = true;
      await delay(10);
      foo.barHooked = true;
      const err = new Error('test');
      const [callback] = args.methodArgs;
      callback(err);
      throw err;
    });
    foo.bar((err: any, a: number) => {
      if (err) {
        onReject(err);
      } else {
        onResolve(a);
      }
    });
    // expect
    await expect(myPromise).rejects.toThrow('test');
    expect(foo.barCalled).toBeFalsy();
    expect(foo.barHooked).toBeTruthy();
    await delay(10); // we have to wait in order to let the catch promise to be executed,
    // since it will happen after the execution of the bar callback (the promise).
    expect(foo.bar).toBe(originalBar);
  });
});
