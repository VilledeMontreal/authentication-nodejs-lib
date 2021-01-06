/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeHttpClient,
  IHttpClient,
  ILogger,
  NoopLogger,
} from '@villedemontreal/auth-core';
import { IHttpDefaults } from '@villedemontreal/auth-core/dist/http/IHttpDefaults';
import { injectHttpClient } from './injectHttpClient';
import { IOidcSessionConfig } from './IOidcSessionConfig';

describe('injectHttpClient', () => {
  test('sessionConfig without options', () => {
    const { factory } = createHttpClientFactory();
    const sessionConfig = injectHttpClient(factory) as any;
    expect(sessionConfig).toBeDefined();
    expect(sessionConfig.factory).toBeDefined();
    expect(sessionConfig.factory.createHttpClient).toBe(factory);
  });

  test('sessionConfig without factory', () => {
    const sessionConfig: IOidcSessionConfig = {
      canUseRefreshTokens: true,
    };
    const { factory } = createHttpClientFactory();
    const newSessionConfig = injectHttpClient(factory, sessionConfig) as any;
    expect(newSessionConfig).toBeDefined();
    expect(newSessionConfig).not.toBe(sessionConfig);
    expect(newSessionConfig.factory).toBeDefined();
    expect(newSessionConfig.factory.createHttpClient).toBe(factory);
  });

  test('sessionConfig with custom http client', () => {
    const httpClient = new FakeHttpClient();
    const sessionConfig: IOidcSessionConfig = {
      factory: {
        createHttpClient: pLogger => httpClient,
      },
    };
    const { factory } = createHttpClientFactory();
    const newSessionConfig = injectHttpClient(factory, sessionConfig) as any;
    expect(newSessionConfig).toBeDefined();
    expect(newSessionConfig).toBe(sessionConfig);
    expect(newSessionConfig.factory).toBeDefined();
    expect(newSessionConfig.factory.createHttpClient(new NoopLogger())).toBe(
      httpClient,
    );
  });

  test('sessionConfig with custom logger', () => {
    const logger = new NoopLogger();
    const sessionConfig: IOidcSessionConfig = {
      factory: {
        createLogger: () => logger,
      },
    };
    const { factory } = createHttpClientFactory();
    const newSessionConfig = injectHttpClient(factory, sessionConfig) as any;
    expect(newSessionConfig).toBeDefined();
    expect(newSessionConfig).not.toBe(sessionConfig);
    expect(newSessionConfig.factory).toBeDefined();
    expect(newSessionConfig.factory.createHttpClient).toBe(factory);
    const newLogger = newSessionConfig.factory.createLogger();
    expect(newLogger).toBe(logger);
  });

  function createHttpClientFactory() {
    const httpClient = new FakeHttpClient();
    const factory: (logger: ILogger, defaults: IHttpDefaults) => IHttpClient = (
      logger,
      defaults,
    ) => httpClient;
    return {
      factory,
      httpClient,
    };
  }
});
