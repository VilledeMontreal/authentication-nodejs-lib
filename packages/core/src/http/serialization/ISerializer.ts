/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Contract that any HTTP serializer must implement
 */
export interface ISerializer {
  /**
   * returns a serialized object, either as a string or as a Buffer,
   * depending on the kind of data beeing serialized.
   * @param data the Javascript object to serialize
   */
  serialize(data: any): string | Buffer;

  /**
   * returns the deserialized Javascript object from the received HTTP response's body
   * (either as a text or as a buffer)
   * @param data the HTTP response's body to deserialize
   */
  deserialize(data: string | Buffer): any;
}
