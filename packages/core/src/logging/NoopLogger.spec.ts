/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { NoopLogger } from './NoopLogger';

describe('NoopLogger', () => {
  const logger = new NoopLogger();

  test('debug', () => {
    logger.debug({ foo: 'bar' }, 'Hello foo');
  });

  test('error', () => {
    logger.error({ foo: 'bar' }, 'Hello foo');
  });

  test('info', () => {
    logger.info({ foo: 'bar' }, 'Hello foo');
  });

  test('warning', () => {
    logger.warning({ foo: 'bar' }, 'Hello foo');
  });
});
