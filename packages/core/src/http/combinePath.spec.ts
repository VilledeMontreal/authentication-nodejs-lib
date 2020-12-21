/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { combinePath } from './combinePath';

test('combinePath', () => {
  expect(combinePath('', 'bar')).toBe('bar');
  expect(combinePath('foo', '')).toBe('foo');
  expect(combinePath('foo', 'bar')).toBe('foo/bar');
  expect(combinePath('foo/', 'bar')).toBe('foo/bar');
  expect(combinePath('foo', '/bar')).toBe('foo/bar');
  expect(combinePath('foo/', '/bar')).toBe('foo/bar');
  try {
    combinePath('', '');
    throw new Error('expected to fail with empty parameters');
  } catch (e) {
    expect(e.message).toBe(
      'Expected to have at least one parameter a or b to be defined',
    );
  }
});
