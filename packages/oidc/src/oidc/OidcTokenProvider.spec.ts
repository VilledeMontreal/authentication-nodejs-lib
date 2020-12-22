/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeHttpClient,
  FakeLogger,
  FakeTimeProvider,
  IHttpMock,
  IHttpRequest,
} from '@villemontreal/auth-core';
import { IOidcClientConfig } from '..';
import { IClientCredentials } from '../creds/IClientCredentials';
import { IUserCredentials } from '../creds/IUserCredentials';
import { FakeClaimsProvider } from '../tokens/FakeClaimsProvider';
import { OidcServerConfigGetter } from './OidcServerConfigGetter';
import {
  encodeBasicAuth,
  guessGrantType,
  OidcTokenProvider,
  serializeScopes,
} from './OidcTokenProvider';
import { OidcWellknownServerConfigProvider } from './OidcWellknownServerConfigProvider';

interface ISetupOptions {
  useServiceAccount?: boolean;
  useEmptyServerConfig?: boolean;
  shouldFail?: boolean;
  authMethod?: 'client_secret_basic' | 'client_secret_post' | undefined;
  clientConfig?: IOidcClientConfig;
}

describe('OidcTokenProvider', () => {
  describe('client_credentials grant', () => {
    test('getToken - basic - success', async () => {
      // setup
      const { provider, httpClient } = setup();
      // act
      const token = await provider.getToken();
      // expect
      expect(token).toBeDefined();
      expect(token.access_token).toBe('some-access-token');
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBe(300);
      expect(token.expiresAt.toISOString()).toBe('2020-01-26T22:28:14.000Z');
      expect(token.issuer).toBe('https://auth.zorg.ca');
      const lastReq = httpClient.lastCall().req || {};
      expect(lastReq.body.grant_type).toBe('client_credentials');
      expect((lastReq.headers || {}).authorization).toBeDefined();
      expect(lastReq.body.client_id).not.toBeDefined();
      expect(lastReq.body.client_secret).not.toBeDefined();
      expect(await token.getClaims()).toEqual({ userName: 'foo' });
    });

    test('getToken - post - success', async () => {
      // setup
      const { provider, httpClient } = setup({
        authMethod: 'client_secret_post',
      });
      // act
      const token = await provider.getToken();
      // expect
      expect(token).toBeDefined();
      expect(token.access_token).toBe('some-access-token');
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBe(300);
      expect(token.expiresAt.toISOString()).toBe('2020-01-26T22:28:14.000Z');
      expect(token.issuer).toBe('https://auth.zorg.ca');
      const lastReq = httpClient.lastCall().req || {};
      expect(lastReq.body.grant_type).toBe('client_credentials');
      expect((lastReq.headers || {}).authorization).not.toBeDefined();
      expect(lastReq.body.client_id).toBeDefined();
      expect(lastReq.body.client_secret).toBeDefined();
      expect(await token.getClaims()).toEqual({ userName: 'foo' });
    });

    test('getToken - failure', async () => {
      // setup
      const { provider } = setup({ shouldFail: true });
      // act
      try {
        await provider.getToken();
        throw new Error('expected token request to fail');
      } catch (e) {
        // expect
        expect(e.statusCode).toBe(401);
        expect(e.body).toBeDefined();
        expect(e.body.error).toBe('invalid_client');
      }
    });
  });

  describe('password grant', () => {
    test('getToken - success', async () => {
      // setup
      const { provider, httpClient } = setup({ useServiceAccount: true });
      // act
      const token = await provider.getToken();
      // expect
      expect(token).toBeDefined();
      expect(token.access_token).toBe('some-access-token');
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBe(300);
      expect(token.expiresAt.toISOString()).toBe('2020-01-26T22:28:14.000Z');
      expect(token.issuer).toBe('https://auth.zorg.ca');
      expect(httpClient.lastCall().req.body.grant_type).toBe('password');
      expect(await token.getClaims()).toEqual({ userName: 'foo' });
    });

    test('getToken - failure', async () => {
      // setup
      const { provider } = setup({ useServiceAccount: true, shouldFail: true });
      // act
      try {
        await provider.getToken();
        throw new Error('expected token request to fail');
      } catch (e) {
        // expect
        expect(e.statusCode).toBe(401);
        expect(e.body).toBeDefined();
        expect(e.body.error).toBe('invalid_client');
      }
    });
  });

  describe('refresh_token grant', () => {
    test('getToken - success', async () => {
      // setup
      const { provider, httpClient } = setup();
      // act
      const token = await provider.refreshToken('myRefreshToken');
      // expect
      expect(token).toBeDefined();
      expect(token.access_token).toBe('some-access-token');
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBe(300);
      expect(token.expiresAt.toISOString()).toBe('2020-01-26T22:28:14.000Z');
      expect(token.issuer).toBe('https://auth.zorg.ca');
      expect(httpClient.lastCall().req.body.grant_type).toBe('refresh_token');
      expect(await token.getClaims()).toEqual({ userName: 'foo' });
    });

    test('getToken - failure', async () => {
      // setup
      const { provider } = setup({ shouldFail: true });
      // act
      try {
        await provider.refreshToken('badRefreshToken');
        throw new Error('expected token request to fail');
      } catch (e) {
        // expect
        expect(e.statusCode).toBe(401);
        expect(e.body).toBeDefined();
        expect(e.body.error).toBe('invalid_client');
      }
    });
  });

  describe('validation errors', () => {
    test('unexpected auth method', async () => {
      // setup
      const options: ISetupOptions = {};
      (options as any).authMethod = 'bad auth method';
      const { provider } = setup(options);
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have wrong auth method');
      } catch (e) {
        // expect
        expect(e.message).toBe('Unexpected auth method "bad auth method"');
      }
    });

    test('unexpected grant type', async () => {
      // setup
      const { provider } = setup({
        clientConfig: {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          grantType: 'myGrantType',
          issuer: 'https://auth.zorg.ca',
        },
      });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have wrong grant type');
      } catch (e) {
        // expect
        expect(e.message).toBe('Unexpected grant type "myGrantType"');
      }
    });

    test('missing client1', async () => {
      // setup
      const client: IClientCredentials = {} as IClientCredentials;
      const { provider } = setup({
        clientConfig: {
          client,
          // tslint:disable-next-line: object-literal-sort-keys
          authMethod: 'client_secret_basic',
          grantType: 'password',
          issuer: 'https://auth.zorg.ca',
        },
      });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have missing client');
      } catch (e) {
        // expect
        expect(e.message).toBe('clientConfig.client is empty');
      }
    });

    test('missing client2', async () => {
      // setup
      const client: any = null;
      const { provider } = setup({
        clientConfig: {
          client: client as IClientCredentials,
          // tslint:disable-next-line: object-literal-sort-keys
          authMethod: 'client_secret_basic',
          grantType: 'password',
          issuer: 'https://auth.zorg.ca',
        },
      });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have missing client');
      } catch (e) {
        // expect
        expect(e.message).toBe('clientConfig.client is empty');
      }
    });

    test('missing client3', async () => {
      // setup
      const client: IClientCredentials = { id: 'id' } as IClientCredentials;
      const { provider } = setup({
        clientConfig: {
          client,
          // tslint:disable-next-line: object-literal-sort-keys
          authMethod: 'client_secret_basic',
          grantType: 'password',
          issuer: 'https://auth.zorg.ca',
        },
      });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have missing client');
      } catch (e) {
        // expect
        expect(e.message).toBe('clientConfig.client is empty');
      }
    });

    test('missing user', async () => {
      // setup
      const { provider } = setup({
        clientConfig: {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          grantType: 'password',
          issuer: 'https://auth.zorg.ca',
        },
      });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have missing user');
      } catch (e) {
        // expect
        expect(e.message).toBe(
          'Expected to receive a user in the OIDC client config for password grant',
        );
      }
    });

    test('missing refresh token', async () => {
      // setup
      const { provider } = setup({
        clientConfig: {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          grantType: 'refresh_token',
          issuer: 'https://auth.zorg.ca',
        },
      });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have missing user');
      } catch (e) {
        // expect
        expect(e.message).toBe('Expected to receive a refresh token');
      }
    });

    test('missing token_endpoint', async () => {
      // setup
      const { provider } = setup({ useEmptyServerConfig: true });
      try {
        // act
        await provider.getToken();
        throw new Error('expected to have missing token_endpoint');
      } catch (e) {
        // expect
        expect(e.message).toBe('serverConfig.token_endpoint is empty');
      }
    });
  });

  describe('helpers', () => {
    describe('guessGrantType', () => {
      test('client_credentials', () => {
        const clientConfig: IOidcClientConfig = {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          issuer: 'issuer',
        };
        expect(guessGrantType(clientConfig)).toBe('client_credentials');
      });

      test('client_credentials', () => {
        const clientConfig: IOidcClientConfig = {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          issuer: 'issuer',
          user: {
            password: 'pwd',
            username: 'username',
          },
        };
        expect(guessGrantType(clientConfig)).toBe('password');
      });

      test('refresh_token', () => {
        const clientConfig: IOidcClientConfig = {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          issuer: 'issuer',
        };
        expect(guessGrantType(clientConfig, 'refresh_token')).toBe(
          'refresh_token',
        );
      });

      test('refresh_token2', () => {
        const clientConfig: IOidcClientConfig = {
          authMethod: 'client_secret_basic',
          client: {
            id: 'id',
            secret: 'secret',
          },
          grantType: 'refresh_token',
          issuer: 'issuer',
        };
        expect(guessGrantType(clientConfig)).toBe('refresh_token');
      });
    });

    describe('serializeScopes', () => {
      test('no scope', () => {
        expect(serializeScopes()).toBe('');
      });

      test('string', () => {
        expect(serializeScopes('openid profile')).toBe('openid profile');
      });

      test('array', () => {
        expect(serializeScopes(['openid', 'profile'])).toBe('openid profile');
      });
    });

    describe('encodeBasicAuth', () => {
      test('success', () => {
        expect(encodeBasicAuth('username', 'password')).toBe(
          'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
        );
      });

      test('error - username', () => {
        try {
          encodeBasicAuth('', '');
        } catch (e) {
          expect(e.message).toBe('username is required');
        }
      });

      test('error - password', () => {
        try {
          encodeBasicAuth('username', '');
        } catch (e) {
          expect(e.message).toBe('password is required');
        }
      });

      test('error - username - bad char', () => {
        try {
          encodeBasicAuth('user:name', 'pwd');
        } catch (e) {
          expect(e.message).toBe('username cannot contain ":"');
        }
      });
    });
  });
});

function setup(options: ISetupOptions = {}) {
  const logger = new FakeLogger();
  const timeProvider = new FakeTimeProvider(
    new Date('2020-01-26T17:23:44-05:00'),
  );

  const httpClient = new FakeHttpClient();
  httpClient.register(createWellKnowndHandler(options));
  if (!options.shouldFail) {
    httpClient.register(createClientCredentialsGrantHandler(options));
    httpClient.register(createPasswordGrantHandler(options));
    httpClient.register(createRefreshTokenGrantHandler(options));
  }
  httpClient.register(createUnauthorizedHandler());

  const serverConfigProvider = new OidcWellknownServerConfigProvider(
    logger,
    httpClient,
    timeProvider,
  );
  const claimsProvider = new FakeClaimsProvider({ userName: 'foo' });
  const clientConfig = options.clientConfig || createClientConfig(options);
  const serverConfigGetter = new OidcServerConfigGetter(
    serverConfigProvider,
    clientConfig,
  );
  const provider = new OidcTokenProvider(
    logger,
    httpClient,
    serverConfigGetter,
    clientConfig,
    timeProvider,
    claimsProvider,
  );
  return {
    clientConfig,
    httpClient,
    logger,
    provider,
    serverConfigProvider,
    timeProvider,
  };
}

function createClientConfig(options: ISetupOptions) {
  let user: IUserCredentials | undefined;
  if (options.useServiceAccount) {
    user = {
      password: 'myPassword',
      username: 'myUser',
    };
  }
  const clientConfig: IOidcClientConfig = {
    user,
    // tslint:disable-next-line: object-literal-sort-keys
    authMethod: options.authMethod || 'client_secret_basic',
    client: {
      id: 'id',
      secret: 'secret',
    },
    issuer: 'https://auth.zorg.ca',
    scopes: ['openid', 'profile'],
  };
  return clientConfig;
}

function createWellKnowndHandler(options: ISetupOptions): IHttpMock {
  return {
    accepts: req => req.url.indexOf('.well-known') > 0,
    returns: req => ({
      body: {
        issuer: 'https://auth.zorg.ca',
        jwks_uri: 'https://auth.zorg.ca/jwks',
        token_endpoint: options.useEmptyServerConfig
          ? ''
          : 'https://auth.zorg.ca/token',
        userinfo_endpoint: 'https://auth.zorg.ca/userinfo',
      },
      statusCode: 200,
    }),
  };
}

function createUnauthorizedHandler(): IHttpMock {
  return {
    accepts: req => req.url.indexOf('/token') > 0,
    returns: req => ({
      body: {
        error: 'invalid_client',
      },
      statusCode: 401,
    }),
  };
}

function createPasswordGrantHandler(options: ISetupOptions): IHttpMock {
  return {
    accepts: req =>
      req.method === 'POST' &&
      req.url.indexOf('/token') > 0 &&
      isValidClient(req, options) &&
      req.body &&
      req.body.grant_type === 'password' &&
      req.body.username &&
      req.body.password,
    returns: req => ({
      body: {
        access_token: 'some-access-token',
        expires_in: 300,
        token_type: 'Bearer',
      },
      statusCode: 200,
    }),
  };
}

function createClientCredentialsGrantHandler(
  options: ISetupOptions,
): IHttpMock {
  return {
    accepts: req =>
      req.method === 'POST' &&
      req.url.indexOf('/token') > 0 &&
      isValidClient(req, options) &&
      req.body &&
      req.body.grant_type === 'client_credentials',
    returns: req => ({
      body: {
        access_token: 'some-access-token',
        expires_in: 300,
        token_type: 'Bearer',
      },
      statusCode: 200,
    }),
  };
}

function createRefreshTokenGrantHandler(options: ISetupOptions): IHttpMock {
  return {
    accepts: req =>
      req.method === 'POST' &&
      req.url.indexOf('/token') > 0 &&
      isValidClient(req, options) &&
      req.body &&
      req.body.grant_type === 'refresh_token' &&
      req.body.refresh_token,
    returns: req => ({
      body: {
        access_token: 'some-access-token',
        expires_in: 300,
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
      },
      statusCode: 200,
    }),
  };
}

function isValidClient(req: IHttpRequest, options: ISetupOptions): boolean {
  if (
    options.authMethod === 'client_secret_basic' ||
    options.authMethod === undefined
  ) {
    if (
      req.headers &&
      req.headers.authorization &&
      req.headers.authorization.toString().startsWith('Basic ')
    ) {
      return true;
    }
  }
  if (options.authMethod === 'client_secret_post') {
    if (req.body.client_id && req.body.client_secret) {
      return true;
    }
  }
  return false;
}
