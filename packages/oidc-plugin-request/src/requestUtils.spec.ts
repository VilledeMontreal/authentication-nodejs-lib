/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { Request } from 'request';
import { getRequestInfo } from './requestUtils';

describe('requestUtils', () => {
  test('getRequestInfo should default to GET if not provided', () => {
    const req = {
      uri: {
        href: 'http://foo.com/bar',
      },
    };
    expect(getRequestInfo(req as Request)).toEqual({
      method: 'GET',
      url: 'http://foo.com/bar',
    });
  });
});
