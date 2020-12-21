/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { FormSerializer } from './FormSerializer';

describe('FormSerializer', () => {
  describe('serialization', () => {
    test('undefined should produce an empty string', () => {
      const s = new FormSerializer();
      expect(s.serialize(undefined)).toBe('');
    });

    test('null should produce an empty string', () => {
      const s = new FormSerializer();
      expect(s.serialize(null)).toBe('');
    });

    test('a buffer should remain a buffer', () => {
      const s = new FormSerializer();
      const buf = Buffer.from('abc');
      const res = s.serialize(buf);
      expect(res).toBe(buf);
    });

    test('a string should remain a string', () => {
      const s = new FormSerializer();
      const txt = 'abc';
      const res = s.serialize(txt);
      expect(res).toBe(txt);
    });

    test('a URLSearchParams should be serialized as a form string', () => {
      const s = new FormSerializer();
      const obj = new URLSearchParams();
      obj.set('foo', 'bar');
      obj.set('age', '33');
      const res = s.serialize(obj);
      expect(res).toBe('foo=bar&age=33');
    });

    test('an object should be serialized as a form string', () => {
      const s = new FormSerializer();
      const obj = { foo: 'bar', age: 33 };
      const res = s.serialize(obj);
      expect(res).toBe('foo=bar&age=33');
    });
  });

  describe('deserialization', () => {
    test('a string should produce a JSON object', () => {
      const s = new FormSerializer();
      const txt = 'foo=bar&age=33';
      const res = s.deserialize(txt);
      expect(res).toEqual({ foo: 'bar', age: '33' });
    });

    test('an empty string should produce an empty object', () => {
      const s = new FormSerializer();
      const res = s.deserialize('');
      expect(res).toEqual({});
    });

    test('an empty buffer should produce an empty object', () => {
      const s = new FormSerializer();
      const res = s.deserialize(Buffer.from([]));
      expect(res).toEqual({});
    });

    test('a buffer should be converted to a string and then into a JSON object', () => {
      const s = new FormSerializer();
      const buf = Buffer.from('foo=bar&age=33');
      const res = s.deserialize(buf);
      expect(res).toEqual({ foo: 'bar', age: '33' });
    });
  });
});
