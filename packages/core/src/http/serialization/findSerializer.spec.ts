/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { BinarySerializer } from './BinarySerializer';
import { createDefaultDeserializers } from './createDefaultSerializers';
import { findSerializer } from './findSerializer';
import { JsonSerializer } from './JsonSerializer';

describe('findSerializer', () => {
  const serializers = createDefaultDeserializers();

  test('you must provide a contentType', () => {
    try {
      findSerializer('', serializers);
      throw new Error('expected error');
    } catch (error: any) {
      expect(error.message).toBe('contentType is a required parameter');
    }
  });

  test('find serializer with exact match', () => {
    expect(findSerializer('application/json', serializers)).toBeInstanceOf(
      JsonSerializer,
    );
  });

  test('find serializer with partial match', () => {
    expect(findSerializer('image/jpeg', serializers)).toBeInstanceOf(
      BinarySerializer,
    );
  });

  test('unknown contentType should return null', () => {
    expect(findSerializer('application/foobar', serializers)).toBeUndefined();
  });
});
