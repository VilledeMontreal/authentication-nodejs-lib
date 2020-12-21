/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { guessContentTypeFrom } from './guessContentType';

describe('guessContentType', () => {
  test('guessContentType', () => {
    expect(guessContentTypeFrom({ a: 1 })).toBe('application/json');
    expect(guessContentTypeFrom(1)).toBe('application/json');
    expect(guessContentTypeFrom([1, 2, 3])).toBe('application/json');
    expect(guessContentTypeFrom(true)).toBe('application/json');
    expect(guessContentTypeFrom('abc')).toBe('text/plain');
    expect(guessContentTypeFrom(Buffer.from('abc'))).toBe(
      'application/octet-stream',
    );
    expect(guessContentTypeFrom(new URLSearchParams())).toBe(
      'application/x-www-form-urlencoded',
    );
  });
});
