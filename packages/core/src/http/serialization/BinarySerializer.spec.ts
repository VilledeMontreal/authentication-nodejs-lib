/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { BinarySerializer } from './BinarySerializer';

describe('BinarySerializer', () => {
  describe('serialization', () => {
    test('a buffer should produce the same buffer ', () => {
      const s = new BinarySerializer();
      const buf = Buffer.from([1, 2, 3]);
      const res = s.serialize(buf);
      expect(res).toBe(buf);
    });

    test('undefined should produce an empty buffer', () => {
      const s = new BinarySerializer();
      expect(s.serialize(undefined)).toEqual(Buffer.from([]));
    });

    test('null should produce an empty buffer', () => {
      const s = new BinarySerializer();
      expect(s.serialize(null)).toEqual(Buffer.from([]));
    });

    test('empty string should throw', () => {
      const s = new BinarySerializer();
      try {
        s.serialize('');
        throw new Error('error');
      } catch (error) {
        expect(error.message).toEqual(
          'A binary serializer can only receive a buffer',
        );
      }
    });

    test('a string should throw', () => {
      const s = new BinarySerializer();
      try {
        s.serialize('hello');
        throw new Error('error');
      } catch (error) {
        expect(error.message).toEqual(
          'A binary serializer can only receive a buffer',
        );
      }
    });
  });

  describe('deserialization', () => {
    test('a buffer should produce the same buffer ', () => {
      const s = new BinarySerializer();
      const buf = Buffer.from([1, 2, 3]);
      const res = s.deserialize(buf);
      expect(res).toBe(buf);
    });

    test('an empty string should produce an empty buffer ', () => {
      const s = new BinarySerializer();
      const res = s.deserialize('');
      expect(res).toEqual(Buffer.from([]));
    });

    test('an empty string should produce an empty buffer ', () => {
      const s = new BinarySerializer();
      const res = s.deserialize('');
      expect(res).toEqual(Buffer.from([]));
    });

    test('a string should throw', () => {
      const s = new BinarySerializer();
      try {
        s.deserialize('hello');
        throw new Error('error');
      } catch (error) {
        expect(error.message).toEqual(
          'A binary serializer can only receive a buffer',
        );
      }
    });
  });
});
