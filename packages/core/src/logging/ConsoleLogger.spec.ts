/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ConsoleLogger } from './ConsoleLogger';

describe('NoopLogger', () => {
  const logger = new ConsoleLogger();

  test('debug', () => {
    logger.debug({ foo: 'bar' }, 'Hello foo');
    logger.debug(null, 'Hello foo');
    logger.debug({ foo: 'bar' });
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

  test('debug with empty correlation ID', () => {
    const logger2 = new ConsoleLogger(() => '');
    logger2.debug({ foo: 'bar' }, 'Hello foo');
  });

  test('debug with correlation ID', () => {
    const logger2 = new ConsoleLogger(() => 'groo');
    logger2.debug({ foo: 'bar' }, 'Hello foo');
  });
});
