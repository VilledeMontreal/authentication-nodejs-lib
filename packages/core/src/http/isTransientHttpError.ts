/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Tells if the submitted error is transient or not.
 * A transient error can be retried
 * @param [statusCode] the http status code returned in the response
 * @param [code] the error code of a native Node exception.
 */
export function isTransientHttpError(statusCode?: number, code?: string) {
  if (statusCode) {
    if (statusCode >= 500) {
      return true;
    }
    if ([429, 408].includes(statusCode)) {
      return true;
    }
  }
  if (
    // See all existing error codes here: https://nodejs.org/api/os.html#posix-error-constants
    [
      'ECONNRESET',
      'ECONNABORTED',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EPIPE',
      'ETIMEDOUT',
      'ENETUNREACH',
      'EAI_AGAIN',
      'EPROTO',
    ].includes(code ?? '')
  ) {
    return true;
  }
  if (code === 'ESerialization') {
    return false;
  }
  return false;
}
