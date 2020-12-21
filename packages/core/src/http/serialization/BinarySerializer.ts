/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ISerializer } from './ISerializer';

/**
 * HTTP serializer that can handle Binary content
 */
export class BinarySerializer implements ISerializer {
  /**
   * returns a serialized object, either as a string or as a Buffer,
   * depending on the kind of data beeing serialized.
   * @param data the Javascript object to serialize
   */
  public serialize(data: any): string | Buffer {
    if (data === undefined || data === null) {
      return Buffer.from([]);
    }
    if (data instanceof Buffer) {
      return data;
    }
    throw new Error('A binary serializer can only receive a buffer');
  }

  /**
   * returns the deserialized Javascript object from the received HTTP response's body
   * (either as a text or as a buffer)
   * @param data the HTTP response's body to deserialize
   */
  public deserialize(data: string | Buffer) {
    if (!data) {
      return Buffer.from([]);
    }
    if (data instanceof Buffer) {
      return data;
    }
    throw new Error('A binary serializer can only receive a buffer');
  }
}
