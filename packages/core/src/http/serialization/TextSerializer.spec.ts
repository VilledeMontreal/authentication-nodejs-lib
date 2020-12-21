/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { TextSerializer } from './TextSerializer';

describe('TextSerializer', () => {
  describe('serialization', () => {
    test('undefined should produce an empty string', () => {
      const s = new TextSerializer();
      expect(s.serialize(undefined)).toBe('');
    });

    test('null should produce an empty string', () => {
      const s = new TextSerializer();
      expect(s.serialize(null)).toBe('');
    });

    test('a buffer should throw', () => {
      const s = new TextSerializer();
      try {
        s.serialize(Buffer.from([]));
        throw new Error('error');
      } catch (error) {
        expect(error.message).toEqual(
          'A text serializer can only receive a string',
        );
      }
    });
  });

  describe('deserialization', () => {
    test('a string should produce the same string', () => {
      const s = new TextSerializer();
      const txt = 'hello';
      const res = s.deserialize(txt);
      expect(res).toBe(txt);
    });

    test('an empty string should produce an empty string', () => {
      const s = new TextSerializer();
      const res = s.deserialize('');
      expect(res).toEqual('');
    });

    test('an empty buffer should produce an empty string', () => {
      const s = new TextSerializer();
      const res = s.deserialize(Buffer.from([]));
      expect(res).toEqual('');
    });

    test('a buffer should be converted to a string', () => {
      const s = new TextSerializer();
      const buf = Buffer.from('hello');
      const res = s.deserialize(buf);
      expect(res).toBe('hello');
    });
  });
});
