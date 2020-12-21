/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Returns a new path by combining the a and b segments,
 * ensuring that a and b are properly separated by a single slash.
 * @param a a path segment
 * @param b another path segment
 */
export function combinePath(a: string, b: string) {
  if (a && b) {
    let adjustedB = b;
    if (b.startsWith('/')) {
      adjustedB = adjustedB.substr(1);
    }
    if (a.endsWith('/')) {
      return `${a}${adjustedB}`;
    }
    return `${a}/${adjustedB}`;
  }
  if (a) {
    return a;
  }
  if (b) {
    return b;
  }
  throw new Error(
    'Expected to have at least one parameter a or b to be defined',
  );
}
