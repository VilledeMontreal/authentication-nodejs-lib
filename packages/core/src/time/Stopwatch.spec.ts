/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { Stopwatch } from './Stopwatch';
import { delay } from './delay';

describe('Stopwatch', () => {
  test('should create a new watch, not started', () => {
    const watch = new Stopwatch();
    expect(watch.isStarted()).toBeFalsy();
    expect(watch.isStopped()).toBeFalsy();
  });

  test('should create a new started watch', () => {
    const watch = Stopwatch.startNew();
    expect(watch.isStarted()).toBeTruthy();
    expect(watch.isStopped()).toBeFalsy();
  });

  test('elapsed time without stop', async () => {
    const watch = Stopwatch.startNew();
    await delay(100);
    const elapsed = watch.elapsedTimeInMS();
    expect(elapsed).toBeGreaterThanOrEqual(99);
    expect(elapsed).toBeLessThan(120);
    expect(watch.isStarted()).toBeTruthy();
    expect(watch.isStopped()).toBeFalsy();
  });

  test('elapsed time with stop', async () => {
    const watch = Stopwatch.startNew();
    await delay(100);
    watch.stop();
    expect(watch.isStarted()).toBeTruthy();
    expect(watch.isStopped()).toBeTruthy();
    const elapsed = watch.elapsedTimeInMS();
    expect(elapsed).toBeGreaterThanOrEqual(99);
    expect(elapsed).toBeLessThan(120);
    await delay(50);
    expect(watch.elapsedTimeInMS()).toBeCloseTo(elapsed);
  });

  test('restart watch should reset and start', async () => {
    const watch = Stopwatch.startNew();
    await delay(100);
    watch.restart();
    await delay(50);
    const elapsed = watch.elapsedTimeInMS();
    expect(elapsed).toBeGreaterThanOrEqual(49);
    expect(elapsed).toBeLessThan(70);
    expect(watch.isStarted()).toBeTruthy();
    expect(watch.isStopped()).toBeFalsy();
  });

  test('toString', () => {
    const watch = new Stopwatch();
    expect(watch.toString()).toBe('Watch is empty');
    watch.start();
    expect(watch.toString()).toMatch(/Watch still running after .+ ms/);
    watch.stop();
    expect(watch.toString()).toMatch(/Watch stopped after .+ ms/);
  });

  test('should throw when starting an already started watch', () => {
    const watch = Stopwatch.startNew();
    expect(() => {
      watch.start();
      // tslint:disable-next-line: quotemark
    }).toThrowError("You can't start an already started watch!");
  });

  test('should throw when stopping a non started watch', () => {
    const watch = new Stopwatch();
    expect(() => {
      watch.stop();
    }).toThrowError('You must start the watch before calling this method');
  });

  test('should throw when accessing elasped time of a non started watch', () => {
    const watch = new Stopwatch();
    expect(() => {
      watch.elapsedTimeInMS();
    }).toThrowError('You must start the watch to obtain elapsed time');
  });
});
