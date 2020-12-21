/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { SystemTimeProvider } from './SystemTimeProvider';

describe('SystemTimeProvider', () => {
  test('now should return the current time', () => {
    const provider = new SystemTimeProvider();
    const currentTime = new Date().getTime();
    const now = provider.getNow().getTime();
    expect(now).toBeGreaterThanOrEqual(currentTime);
    expect(now).toBeLessThanOrEqual(new Date().getTime());
  });
});
