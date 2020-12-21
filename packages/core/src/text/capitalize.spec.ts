/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { capitalize } from './capitalize';

describe('capitalize', () => {
  test('empty string', () => {
    expect(capitalize('')).toBe('');
  });
  test('one char', () => {
    expect(capitalize('a')).toBe('A');
  });
  test('one word', () => {
    expect(capitalize('paul')).toBe('Paul');
  });
  test('two words', () => {
    expect(capitalize('jean paul')).toBe('Jean Paul');
  });
  test('mixed', () => {
    expect(capitalize('jeanPaul')).toBe('JeanPaul');
  });
  test('already capitalized', () => {
    expect(capitalize('Paul')).toBe('Paul');
  });
});
