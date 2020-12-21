/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ISerializer } from './ISerializer';

/**
 * The map of registered serializers for specific content types
 */
export interface ISerializers {
  /**
   * gets a serializer for the requested content type
   */
  [key: string]: ISerializer | undefined;
}
