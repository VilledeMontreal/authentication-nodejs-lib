/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { cleanupHttpError } from './cleanupHttpError';

test('cleanupHttpError', () => {
  const error: any = new Error('test');
  error.response = {};
  expect(error.response).toBeDefined();
  const clone = cleanupHttpError(error);
  expect(clone).not.toBe(error);
  expect(clone.response).not.toBeDefined();
  expect(clone.message).toBe(error.message);
  expect(clone.name).toBe(error.name);
  expect(clone.stack).toBe(error.stack);
});
