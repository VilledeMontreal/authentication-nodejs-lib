/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { isTransientHttpError } from './isTransientHttpError';

describe('isTransientHttpError', () => {
  test('500 and above should be transcient ', () => {
    expect(isTransientHttpError(500)).toBeTruthy();
    expect(isTransientHttpError(503)).toBeTruthy();
  });

  [
    'ECONNRESET',
    'ECONNABORTED',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EPIPE',
    'ETIMEDOUT',
    'ENETUNREACH',
    'EAI_AGAIN',
  ].forEach(code => {
    test(`${code} and above should be transcient`, () => {
      expect(isTransientHttpError(undefined, code)).toBeTruthy();
    });
  });

  test('no statusCode should not be transcient ', () => {
    expect(isTransientHttpError()).toBeFalsy();
  });

  test('400 should not be transcient ', () => {
    expect(isTransientHttpError(400)).toBeFalsy();
  });

  test('408 should be transcient ', () => {
    expect(isTransientHttpError(408)).toBeTruthy();
  });

  test('429 should be transcient ', () => {
    expect(isTransientHttpError(429)).toBeTruthy();
  });

  test('ESerialization should not be transcient ', () => {
    expect(isTransientHttpError(undefined, 'ESerialization')).toBeFalsy();
  });
});
