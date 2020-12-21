/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { FakeLogger } from './FakeLogger';

describe('FakeLogger', () => {
  test('debug', () => {
    const logger = new FakeLogger();
    logger.debug({ foo: 'bar', age: 33 }, 'Some debug message');
    expect(logger.entries[0]).toEqual({
      logType: 'debug',
      messageObj: {
        age: 33,
        foo: 'bar',
      },
      txtMsg: 'Some debug message',
    });
  });

  test('info', () => {
    const logger = new FakeLogger();
    logger.info({ foo: 'bar', age: 33 }, 'Some info message');
    expect(logger.entries[0]).toEqual({
      logType: 'info',
      messageObj: {
        age: 33,
        foo: 'bar',
      },
      txtMsg: 'Some info message',
    });
  });

  test('error', () => {
    const logger = new FakeLogger();
    logger.error({ foo: 'bar', age: 33 }, 'Some error message');
    expect(logger.entries[0]).toEqual({
      logType: 'error',
      messageObj: {
        age: 33,
        foo: 'bar',
      },
      txtMsg: 'Some error message',
    });
  });

  test('warning', () => {
    const logger = new FakeLogger();
    logger.warning({ foo: 'bar', age: 33 }, 'Some warning message');
    expect(logger.entries[0]).toEqual({
      logType: 'warning',
      messageObj: {
        age: 33,
        foo: 'bar',
      },
      txtMsg: 'Some warning message',
    });
  });

  test('last / reset', () => {
    const logger = new FakeLogger();
    expect(logger.last()).toBeUndefined();
    logger.debug({ foo: 'bar', age: 33 }, 'Some debug message');
    expect(logger.last()).toEqual({
      logType: 'debug',
      messageObj: {
        age: 33,
        foo: 'bar',
      },
      txtMsg: 'Some debug message',
    });
    logger.reset();
    expect(logger.last()).toBeUndefined();
  });
});
