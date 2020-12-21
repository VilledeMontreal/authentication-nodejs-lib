/*
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ITimeProvider } from './ITimeProvider';

/** Real implementation of the time provider */
export class SystemTimeProvider implements ITimeProvider {
  /** returns the current time */
  public getNow(): Date {
    return new Date();
  }
}
