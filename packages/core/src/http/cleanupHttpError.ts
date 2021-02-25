/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Removes problematic fields from an error object in order to log it.
 * For example, removing the "response" object that would otherwise
 * print a ton of lines.
 * @param error an error object
 */
export function cleanupHttpError(error: any) {
  const clonedError = {
    ...error,
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  delete clonedError.response;
  return clonedError;
}
