/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { EventEmitter } from 'events';
import { FakeHttpRequestCorrelator } from './FakeHttpRequestCorrelator';

describe('FakeHttpRequestCorrelator', () => {
  test('empty correlator', () => {
    const correlator = new FakeHttpRequestCorrelator();
    expect(correlator.getId()).toBeUndefined();
  });

  test('correlator initialized with an id', () => {
    const correlator = new FakeHttpRequestCorrelator('foo');
    expect(correlator.getId()).toBe('foo');
  });

  test('run with a different ID', () => {
    const correlator = new FakeHttpRequestCorrelator('foo');
    expect(correlator.getId()).toBe('foo');
    correlator.withId(() => {
      expect(correlator.getId()).toBe('bar');
    }, 'bar');
    expect(correlator.getId()).toBe('foo');
  });

  test('run withIdAsync with a different ID', async () => {
    const correlator = new FakeHttpRequestCorrelator('foo');
    expect(correlator.getId()).toBe('foo');
    await correlator.withIdAsync(() => {
      expect(correlator.getId()).toBe('bar');
      return Promise.resolve();
    }, 'bar');
    expect(correlator.getId()).toBe('foo');
  });

  test('correlator bind emitter', () => {
    const correlator = new FakeHttpRequestCorrelator('foo');
    const emitter = new EventEmitter();
    correlator.bind(emitter);
    expect(correlator.emitters[0]).toBe(emitter);
    expect(correlator.functions.length).toBe(0);
  });
  test('correlator bind function', () => {
    const correlator = new FakeHttpRequestCorrelator('foo');
    const func = () => true;
    correlator.bind(func);
    expect(correlator.functions[0]).toBe(func);
    expect(correlator.emitters.length).toBe(0);
  });
});
