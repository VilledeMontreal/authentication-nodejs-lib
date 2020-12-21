/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { StandardContentTypes } from '../StandardContentTypes';

/**
 * returns the HTTP content type for the submitted Javascript object
 * @param data the Javascript object to check
 */
export function guessContentTypeFrom(data: unknown) {
  if (data === undefined || data === null) {
    return undefined;
  }
  if (typeof data === 'string') {
    return StandardContentTypes.textPlain;
  }
  if (data instanceof Buffer) {
    return StandardContentTypes.applicationOctetStream;
  }
  if (data instanceof URLSearchParams) {
    return StandardContentTypes.applicationForm;
  }
  return StandardContentTypes.applicationJson;
}
