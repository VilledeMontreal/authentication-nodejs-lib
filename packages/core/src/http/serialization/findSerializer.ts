/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ISerializer } from './ISerializer';
import { ISerializers } from './ISerializers';

/**
 * returns the serializer matching the submitted @param contentType or undefined.
 *
 * Note that it will try to match a base type (text, image, audio, video...) if it
 * could not find a serializer with the full contentType (text/html).
 * @param contentType the contentType handled by the serializer
 * @param serializers the map of existing serializers
 */
export function findSerializer(
  contentType: string,
  serializers: ISerializers,
): ISerializer | undefined {
  if (!contentType) {
    throw new Error('contentType is a required parameter');
  }
  // remove charset from contentType (ex: application/x-yaml; charset=utf-8)
  let adjustedContentType = contentType.split(';')[0];
  let serializer = serializers[adjustedContentType];
  if (!serializer) {
    // remove the subtype and try a more generic serializer, such as text or image
    // ex: 'text/html' becomes 'text'
    [adjustedContentType] = contentType.split('/');
    serializer = serializers[adjustedContentType];
  }
  return serializer;
}
