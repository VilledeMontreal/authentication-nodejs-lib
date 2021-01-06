/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeLogger,
  FakeTimeProvider,
  ILogger,
  ITimeProvider,
} from '@villedemontreal/auth-core';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcSessionBuilder } from './OidcSessionBuilder';
import { OidcSessionState } from './OidcSessionState';

describe('OidcSessionBuilder', () => {
  describe('validation errors', () => {
    test('missing clientConfig', () => {
      // setup
      const builder = new OidcSessionBuilder();
      const clientConfig: any = null;
      expect.assertions(1);
      try {
        // act
        builder.buildSession(clientConfig as IOidcClientConfig);
      } catch (e) {
        // expect
        expect(e.message).toBe('clientConfig is required');
      }
    });
  });

  describe('create session', () => {
    test('with discovery', async () => {
      // setup
      const builder = new OidcSessionBuilder();
      const clientConfig: IOidcClientConfig = {
        authMethod: 'client_secret_basic',
        client: {
          id: 'id',
          secret: 'secret',
        },
        issuer: 'https://auth.zorg.ca',
        scopes: ['openid', 'profile'],
      };
      // act
      const session = builder.buildSession(clientConfig);
      // expect
      expect(session).toBeDefined();
      expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    });

    test('with custom issuer', async () => {
      // setup
      const builder = new OidcSessionBuilder();
      const clientConfig: IOidcClientConfig = {
        authMethod: 'client_secret_basic',
        client: {
          id: 'id',
          secret: 'secret',
        },
        issuer: {
          authorization_endpoint: 'authorization_endpoint',
          clientinfo_endpoint: 'clientinfo_endpoint',
          issuer: 'issuer',
          jwks_uri: 'jwks_uri',
          token_endpoint: 'token_endpoint',
          userinfo_endpoint: 'userinfo_endpoint',
        },
        scopes: ['openid', 'profile'],
      };
      // act
      const session = builder.buildSession(clientConfig);
      // expect
      expect(session).toBeDefined();
      const serverConfig = await session.getServerConfig();
      expect(serverConfig).toBe(clientConfig.issuer);
      expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    });

    test('with custom logger', () => {
      // setup
      const builder = new OidcSessionBuilder();
      const clientConfig: IOidcClientConfig = {
        authMethod: 'client_secret_basic',
        client: {
          id: 'id',
          secret: 'secret',
        },
        issuer: 'https://auth.zorg.ca',
        scopes: ['openid', 'profile'],
      };
      const myLogger = new FakeLogger();
      const createLogger = jest.fn().mockReturnValue(myLogger);
      const options: IOidcSessionConfig = {
        factory: {
          createLogger: createLogger as () => ILogger,
        },
      };
      // act
      const session = builder.buildSession(clientConfig, options);
      // expect
      expect(session).toBeDefined();
      expect(createLogger.mock.calls.length).toBe(1);
    });

    test('with custom time provider', () => {
      // setup
      const builder = new OidcSessionBuilder();
      const clientConfig: IOidcClientConfig = {
        authMethod: 'client_secret_basic',
        client: {
          id: 'id',
          secret: 'secret',
        },
        issuer: 'https://auth.zorg.ca',
        scopes: ['openid', 'profile'],
      };
      const myTimeProvider = new FakeTimeProvider(new Date());
      const createTimeProvider = jest.fn().mockReturnValue(myTimeProvider);
      const options: IOidcSessionConfig = {
        factory: {
          createTimeProvider: createTimeProvider as () => ITimeProvider,
        },
      };
      // act
      const session = builder.buildSession(clientConfig, options);
      // expect
      expect(session).toBeDefined();
      expect(createTimeProvider.mock.calls.length).toBe(1);
    });
  });
});
