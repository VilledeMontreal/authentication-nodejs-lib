/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ITimeProvider } from './ITimeProvider';

/** fake implementation of the time provider to allow unit tests */
export class FakeTimeProvider implements ITimeProvider {
  constructor(private now: Date) {}

  /** returns the current time */
  public getNow(): Date {
    return this.now;
  }

  /** change the current time by applying an offset
   * @param seconds offset in seconds to add to current time
   */
  public offsetBy(seconds: number) {
    this.now = new Date(this.now.getTime() + seconds * 1000);
  }
}
