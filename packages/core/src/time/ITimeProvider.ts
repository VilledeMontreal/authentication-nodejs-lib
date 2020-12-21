/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/** provider used to abstract time and allow unit tests */
export interface ITimeProvider {
  /** returns the current time */
  getNow(): Date;
}
