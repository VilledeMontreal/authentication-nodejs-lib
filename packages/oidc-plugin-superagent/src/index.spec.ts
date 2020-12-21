/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import * as sa from '.';

describe('index', () => {
  test('core should be defined ', () => {
    expect(sa).toBeDefined();
    // going through each exported element will satisfy code coverage
    for (const key of Object.keys(sa)) {
      expect((sa as any)[key]).toBeDefined();
    }
  });
});
