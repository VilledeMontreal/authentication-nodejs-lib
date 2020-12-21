/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { FakeTimeProvider } from '../time/FakeTimeProvider';
import { Cache } from './Cache';

describe('Cache', () => {
  describe('operations', () => {
    test('get / set', () => {
      // setup
      const timeProvider = new FakeTimeProvider(
        new Date(2019, 12, 26, 17, 23, 44),
      );
      const cache = new Cache<string>(timeProvider);
      expect(cache.get('foo')).toBeUndefined();
      // act
      cache.set('foo', 'bar', 100);
      // expect
      expect(cache.get('foo')).toBe('bar');
    });

    test('delete existing', () => {
      // setup
      const timeProvider = new FakeTimeProvider(
        new Date(2019, 12, 26, 17, 23, 44),
      );
      const cache = new Cache<string>(timeProvider);
      cache.set('foo', 'bar', 100);
      expect(cache.get('foo')).toBe('bar');
      // act
      cache.delete('foo');
      // expect
      expect(cache.get('foo')).toBeUndefined();
    });

    test('delete missing', () => {
      // setup
      const timeProvider = new FakeTimeProvider(
        new Date(2019, 12, 26, 17, 23, 44),
      );
      const cache = new Cache<string>(timeProvider);
      expect(cache.get('foo')).toBeUndefined();
      // act
      cache.delete('foo');
      // expect
      expect(cache.get('foo')).toBeUndefined();
    });
  });

  describe('expiration', () => {
    test('get', () => {
      // setup
      const timeProvider = new FakeTimeProvider(
        new Date(2019, 12, 26, 17, 23, 44),
      );
      const cache = new Cache<string>(timeProvider);
      cache.set('foo', 'bar', 100);
      expect(cache.get('foo')).toBe('bar');
      // act
      timeProvider.offsetBy(150);
      // expect
      expect(cache.get('foo')).toBeUndefined();
    });

    test('set', () => {
      // setup
      const timeProvider = new FakeTimeProvider(
        new Date(2019, 12, 26, 17, 23, 44),
      );
      const cache = new Cache<string>(timeProvider);
      cache.set('key1', 'val1', 100);
      expect(cache.get('key1')).toBe('val1');
      // act
      timeProvider.offsetBy(150);
      cache.set('key2', 'val2', 100);
      // expect
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('val2');
    });

    test('delete', () => {
      // setup
      const timeProvider = new FakeTimeProvider(
        new Date(2019, 12, 26, 17, 23, 44),
      );
      const cache = new Cache<string>(timeProvider);
      cache.set('key1', 'val1', 100);
      cache.set('key2', 'val2', 100);
      expect(cache.get('key1')).toBe('val1');
      expect(cache.get('key2')).toBe('val2');
      // act
      timeProvider.offsetBy(150);
      cache.delete('key1');
      // expect
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });
});
