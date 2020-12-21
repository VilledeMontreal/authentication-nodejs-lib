/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/** waits for a specific delay
 * @param ms number of milliseconds to wait for
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
