/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { BinarySerializer } from './BinarySerializer';
import { createDefaultDeserializers } from './createDefaultSerializers';
import { FormSerializer } from './FormSerializer';
import { JsonSerializer } from './JsonSerializer';
import { TextSerializer } from './TextSerializer';

describe('createDefaultDeserializers', () => {
  test('should return an array of serializers', () => {
    const s = createDefaultDeserializers();
    expect(s).toBeDefined();
    expect(s['application/json']).toBeInstanceOf(JsonSerializer);
    expect(s['application/x-www-form-urlencoded']).toBeInstanceOf(
      FormSerializer,
    );
    expect(s['application/octet-stream']).toBeInstanceOf(BinarySerializer);
    expect(s.audio).toBeInstanceOf(BinarySerializer);
    expect(s.image).toBeInstanceOf(BinarySerializer);
    expect(s.text).toBeInstanceOf(TextSerializer);
  });
});
