/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { EventEmitter } from 'events';
import { HttpRequestCorrelator } from './HttpRequestCorrelator';

describe('HttpRequestCorrelator', () => {
  test('should generate a default ID', () => {
    // setup
    const correlator = new HttpRequestCorrelator();
    // act & expect
    expect(correlator.createNewId()).toBe('CID-1');
    expect(correlator.createNewId()).toBe('CID-2');
  });

  test('should generate an ID with the custom generator', () => {
    // setup
    const correlator = new HttpRequestCorrelator(() => 'foobar');
    // act & expect
    expect(correlator.createNewId()).toBe('foobar');
  });

  test('a new correlator should not have storage and no ID', () => {
    // setup
    const correlator = new HttpRequestCorrelator(() => 'foobar');
    // act
    const cid = correlator.getId();
    // expect
    expect(cid).toBeUndefined();
  });

  test('should start a new context with an ID', async () => {
    // setup
    const correlator = new HttpRequestCorrelator();
    // act
    await correlator.withIdAsync(() => {
      // expect
      expect(correlator.getId()).toBe('foobar22');
      return Promise.resolve();
    }, 'foobar22');
  });

  test('should start a new context and generate a new ID', async () => {
    // setup
    const correlator = new HttpRequestCorrelator(() => 'foobar33');
    // act
    await correlator.withIdAsync(() => {
      // expect
      expect(correlator.getId()).toBe('foobar33');
      return Promise.resolve();
    });
  });

  test('should reject promise when callback throws in withIdAsync', async () => {
    // setup
    const correlator = new HttpRequestCorrelator(() => 'foobar33');
    // act
    expect(
      correlator.withIdAsync(() => {
        throw new Error('Foobar');
      }),
    ).rejects.toThrowError('Foobar');
  });

  test('bind should accept anything', () => {
    const correlator = new HttpRequestCorrelator();
    expect(correlator.bind(null as any)).toBeNull();
    const obj = {};
    expect(correlator.bind(obj)).toBe(obj);
  });

  test('bind should override emit only once', () => {
    const correlator = new HttpRequestCorrelator();
    const emitter = new EventEmitter();
    const emit1 = (emitter as any).emit;
    correlator.bind(emitter);
    const emit2 = (emitter as any).emit;
    expect(emit2).not.toBe(emit1);
    correlator.bind(emitter);
    const emit3 = (emitter as any).emit;
    expect(emit3).toBe(emit2);
  });

  test('bind should work without correlation context ', () => {
    const correlator = new HttpRequestCorrelator();
    const emitter = new EventEmitter();
    expect(correlator.getId()).toBeUndefined();
    correlator.bind(emitter);
    let data;
    emitter.on('test', pData => {
      data = pData;
      expect(correlator.getId()).toBeUndefined();
    });
    const testData = {};
    emitter.emit('test', testData);
    expect(data).toBe(testData);
  });

  test('bind should work with correlation context ', () => {
    expect.assertions(4);
    const correlator = new HttpRequestCorrelator();
    const emitter = new EventEmitter();
    emitter.on('test', pData => {
      expect(correlator.getId()).toBe(pData.cid);
    });
    correlator.withId(() => {
      expect(correlator.getId()).toBe('foo');
      correlator.bind(emitter);
      emitter.emit('test', { cid: correlator.getId() });
    }, 'foo');
    // should work with a new CID
    correlator.withId(() => {
      expect(correlator.getId()).toBe('bar');
      correlator.bind(emitter);
      emitter.emit('test', { cid: correlator.getId() });
    }, 'bar');
  });

  test('bind function', () => {
    const correlator = new HttpRequestCorrelator();
    const func = (msg: string) => msg + correlator.getId();
    let f: (msg: string) => string = func;
    correlator.withId(() => {
      f = correlator.bind(func);
    }, 'foo');
    const result = f('Bar-');
    expect(result).toBe('Bar-foo');
  });
  test('bind method', () => {
    const correlator = new HttpRequestCorrelator();
    const obj = {
      title: 'Hello-',
      say(msg: string): string {
        return this.title + msg + correlator.getId();
      },
    };
    correlator.withId(() => {
      obj.say = correlator.bind(obj.say);
    }, 'foo');
    const result = obj.say('Bar-');
    expect(result).toBe('Hello-Bar-foo');
  });
});
