/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
// missing description
export function capitalize(value: string) {
  if (value) {
    return value
      .split(' ')
      .map(x => x[0].toLocaleUpperCase() + x.substring(1))
      .join(' ');
  }
  return value;
}
