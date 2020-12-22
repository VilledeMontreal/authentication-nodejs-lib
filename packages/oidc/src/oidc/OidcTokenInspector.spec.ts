/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeHttpClient,
  FakeLogger,
  FakeTimeProvider,
} from '@villemontreal/auth-core';
import { FakeTokenProvider } from '../tokens/FakeTokenProvider';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcSessionBuilder } from './OidcSessionBuilder';
import { OidcTokenInspector } from './OidcTokenInspector';

describe('OidcTokenInspector', () => {
  test('getTokenInfo, using bearer token', async () => {
    // setup
    const { session, httpClient } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    httpClient.register({
      accepts: req =>
        req.url.startsWith('https://auth.zorg.ca/api/introspection') &&
        req.body.token === 'some token' &&
        req.headers !== undefined &&
        typeof req.headers.authorization === 'string' &&
        req.headers.authorization.startsWith('Bearer '),
      returns: req => ({
        body: {
          active: true,
          client_id: 'client_id',
          exp: 123,
          iat: 123,
          scope: 'openid profile',
        },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const info = await inspector.getTokenInfo('some token');
    // expect
    expect(info.active).toBeTruthy();
    expect(info.client_id).toBe('client_id');
    expect(info.scope).toBe('openid profile');
    expect(await session.hasToken()).toBeTruthy();
  });

  test('getTokenInfo, using client_secret_basic', async () => {
    // setup
    const { session, httpClient } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'client_secret_basic',
    });
    httpClient.register({
      accepts: req =>
        req.url.startsWith('https://auth.zorg.ca/api/introspection') &&
        req.body.token === 'some token' &&
        req.headers !== undefined &&
        typeof req.headers.authorization === 'string' &&
        req.headers.authorization.startsWith('Basic '),
      returns: req => ({
        body: {
          active: true,
          client_id: 'client_id',
          exp: 123,
          iat: 123,
          scope: 'openid profile',
        },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const info = await inspector.getTokenInfo('some token');
    // expect
    expect(info.active).toBeTruthy();
    expect(info.client_id).toBe('client_id');
    expect(info.scope).toBe('openid profile');
    expect(await session.hasToken()).toBeFalsy();
  });

  test('getTokenInfo, using none', async () => {
    // setup
    const { session, httpClient } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'none',
    });
    httpClient.register({
      accepts: req =>
        req.url.startsWith('https://auth.zorg.ca/api/introspection') &&
        req.body.token === 'some token' &&
        req.headers !== undefined &&
        req.headers.authorization === undefined,
      returns: req => ({
        body: {
          active: true,
          client_id: 'client_id',
          exp: 123,
          iat: 123,
          scope: 'openid profile',
        },
        statusCode: 200,
      }),
    });
    // act
    const info = await inspector.getTokenInfo('some token');
    // expect
    expect(info.active).toBeTruthy();
    expect(info.client_id).toBe('client_id');
    expect(info.scope).toBe('openid profile');
  });

  test('getTokenInfo with hint', async () => {
    // setup
    const { session, httpClient } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    httpClient.register({
      accepts: req =>
        req.url.startsWith('https://auth.zorg.ca/api/introspection') &&
        req.body.token === 'some token' &&
        req.headers !== undefined &&
        !!req.headers.authorization,
      returns: req => ({
        body: {
          active: true,
          client_id: 'client_id',
          exp: 123,
          iat: 123,
          scope: 'openid profile',
        },
        statusCode: 200,
      }),
    });
    // act
    const info = await inspector.getTokenInfo('some token', 'hint');
    // expect
    expect(info.active).toBeTruthy();
    expect(info.client_id).toBe('client_id');
    expect(info.scope).toBe('openid profile');
  });

  test('getTokenInfo without accessToken should fail', async () => {
    // setup
    const { session } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    // act
    try {
      await inspector.getTokenInfo('');
      throw new Error('expected error');
    } catch (error) {
      expect(error.message).toBe('accessToken is required');
    }
  });

  test('getTokenInfo without introspeciton endpoint should fail ', async () => {
    // setup
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'id',
        secret: 'secret',
      },
      issuer: {
        authorization_endpoint: 'https://auth.zorg.ca/api/authorization',
        clientinfo_endpoint: 'https://auth.zorg.ca/api/clientinfo',
        introspection_endpoint: '',
        issuer: 'https://auth.zorg.ca',
        jwks_uri: 'https://auth.zorg.ca/api/jwks',
        token_endpoint: 'https://auth.zorg.ca/api/token',
        userinfo_endpoint: 'https://auth.zorg.ca/api/userinfo',
      },
      scopes: ['openid', 'profile'],
    };
    const builder = new OidcSessionBuilder();
    const session = builder.buildSession(clientConfig);
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    // act
    try {
      await inspector.getTokenInfo('token');
      throw new Error('expected error');
    } catch (error) {
      expect(error.message).toBe(
        'serverConfig.introspection_endpoint is empty',
      );
    }
  });

  test('getClientInfo', async () => {
    // setup
    const { session, httpClient } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    httpClient.register({
      accepts: req =>
        req.url.startsWith(
          'https://auth.zorg.ca/api/clientinfo?access_token=some-token',
        ) &&
        !!req.headers &&
        !req.headers.authorization,
      returns: req => ({
        body: {
          displayName: 'client name',
          id: 123,
        },
        statusCode: 200,
      }),
    });
    // act
    const info = await inspector.getClientInfo('some-token');
    // expect
    expect(info.id).toBe(123);
    expect(info.displayName).toBe('client name');
  });

  test('getClientInfo without accessToken should fail', async () => {
    // setup
    const { session } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    // act
    try {
      await inspector.getClientInfo('');
      throw new Error('expected error');
    } catch (error) {
      expect(error.message).toBe('accessToken is required');
    }
  });

  test('getClientInfo without clientinfo endpoint should fail ', async () => {
    // setup
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'id',
        secret: 'secret',
      },
      issuer: {
        authorization_endpoint: 'https://auth.zorg.ca/api/authorization',
        clientinfo_endpoint: '',
        introspection_endpoint: 'https://auth.zorg.ca/api/introspection',
        issuer: 'https://auth.zorg.ca',
        jwks_uri: 'https://auth.zorg.ca/api/jwks',
        token_endpoint: 'https://auth.zorg.ca/api/token',
        userinfo_endpoint: 'https://auth.zorg.ca/api/userinfo',
      },
      scopes: ['openid', 'profile'],
    };
    const builder = new OidcSessionBuilder();
    const session = builder.buildSession(clientConfig);
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    // act
    try {
      await inspector.getClientInfo('token');
      throw new Error('expected error');
    } catch (error) {
      expect(error.message).toBe('serverConfig.clientinfo_endpoint is empty');
    }
  });

  test('getUserInfo', async () => {
    // setup
    const { session, httpClient } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    httpClient.register({
      accepts: req =>
        req.url.startsWith(
          'https://auth.zorg.ca/api/userinfo?access_token=some-token',
        ) &&
        !!req.headers &&
        !req.headers.authorization,
      returns: req => ({
        body: {
          email: 'foo@bar.com',
          sub: '123',
        },
        statusCode: 200,
      }),
    });
    // act
    const info = await inspector.getUserInfo('some-token');
    // expect
    expect(info.sub).toBe('123');
    expect(info.email).toBe('foo@bar.com');
  });

  test('getUserInfo without accessToken should fail', async () => {
    // setup
    const { session } = setup();
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    // act
    try {
      await inspector.getUserInfo('');
      throw new Error('expected error');
    } catch (error) {
      expect(error.message).toBe('accessToken is required');
    }
  });

  test('getUserInfo without clientinfo endpoint should fail ', async () => {
    // setup
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'id',
        secret: 'secret',
      },
      issuer: {
        authorization_endpoint: 'https://auth.zorg.ca/api/authorization',
        clientinfo_endpoint: 'https://auth.zorg.ca/api/clientinfo',
        introspection_endpoint: 'https://auth.zorg.ca/api/introspection',
        issuer: 'https://auth.zorg.ca',
        jwks_uri: 'https://auth.zorg.ca/api/jwks',
        token_endpoint: 'https://auth.zorg.ca/api/token',
        userinfo_endpoint: '',
      },
      scopes: ['openid', 'profile'],
    };
    const builder = new OidcSessionBuilder();
    const session = builder.buildSession(clientConfig);
    const inspector = new OidcTokenInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    // act
    try {
      await inspector.getUserInfo('token');
      throw new Error('expected error');
    } catch (error) {
      expect(error.message).toBe('serverConfig.userinfo_endpoint is empty');
    }
  });
});

function setup() {
  const builder = new OidcSessionBuilder();
  const clientConfig: IOidcClientConfig = {
    authMethod: 'client_secret_basic',
    client: {
      id: 'id',
      secret: 'secret',
    },
    issuer: {
      authorization_endpoint: 'https://auth.zorg.ca/api/authorization',
      clientinfo_endpoint: 'https://auth.zorg.ca/api/clientinfo',
      introspection_endpoint: 'https://auth.zorg.ca/api/introspection',
      issuer: 'https://auth.zorg.ca',
      jwks_uri: 'https://auth.zorg.ca/api/jwks',
      token_endpoint: 'https://auth.zorg.ca/api/token',
      userinfo_endpoint: 'https://auth.zorg.ca/api/userinfo',
    },
    scopes: ['openid', 'profile'],
  };
  const logger = new FakeLogger();
  const timeProvider = new FakeTimeProvider(
    new Date('2019-12-26T17:23:44-05:00'),
  );
  const tokenProvider = new FakeTokenProvider(timeProvider);
  const httpClient = new FakeHttpClient();
  const sessionConfig: IOidcSessionConfig = {
    factory: {
      createHttpClient: pLogger => httpClient,
      createLogger: () => logger,
      createTimeProvider: () => timeProvider,
      createTokenProvider: (
        pLogger,
        pHttpClient,
        pServerConfigGetter,
        pClaimsProvider,
        pTimeProvider,
        pClientConfig,
      ) => tokenProvider,
    },
  };
  const session = builder.buildSession(clientConfig, sessionConfig);
  return {
    httpClient,
    logger,
    session,
    timeProvider,
    tokenProvider,
  };
}
