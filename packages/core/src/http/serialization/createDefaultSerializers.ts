/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { BinarySerializer } from './BinarySerializer';
import { FormSerializer } from './FormSerializer';
import { ISerializers } from './ISerializers';
import { JsonSerializer } from './JsonSerializer';
import { TextSerializer } from './TextSerializer';

/**
 * creates a map of serializers that can handle specific content types
 */
export function createDefaultDeserializers(): ISerializers {
  return {
    'application/json': new JsonSerializer(),
    'application/octet-stream': new BinarySerializer(),
    'application/x-www-form-urlencoded': new FormSerializer(),
    audio: new BinarySerializer(),
    image: new BinarySerializer(),
    text: new TextSerializer(),
  };
}
