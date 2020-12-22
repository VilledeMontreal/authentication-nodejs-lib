/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeHttpClient,
  FakeLogger,
  FakeTimeProvider,
  HttpClientError,
  IHttpRequest,
} from '@villemontreal/auth-core';
import { FakeTokenProvider } from '../tokens/FakeTokenProvider';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcHttpClient } from './OidcHttpClient';
import { OidcSessionBuilder } from './OidcSessionBuilder';
import { IOidcAuthenticatorConfig } from './IOidcAuthenticatorConfig';
import { TokenSet } from '../tokens/TokenSet';

interface ISetupOptions {
  retryUnauthenticatedRequests?: boolean;
  beforeSendRequest?: (req: any, token: TokenSet) => Promise<void>;
}

describe('OidcHttpClient', () => {
  test('send success, no headers', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      url: 'https://api.zorg.ca/foo/bar',
    };
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => ({
        body: { receivedAuth: (pReq.headers as any).authorization },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeTruthy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ receivedAuth: 'Bearer token1' });
  });

  test('send success, with existing auth header', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      headers: {
        authorization: 'Bearer custom',
      },
      url: 'https://api.zorg.ca/foo/bar',
    };
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => ({
        body: { receivedAuth: (pReq.headers as any).authorization },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeFalsy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ receivedAuth: 'Bearer custom' });
  });

  test('send success, with other headers', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      headers: {
        'x-correlation-id': 'foo123',
      },
      url: 'https://api.zorg.ca/foo/bar',
    };
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => ({
        body: {
          correlationId: (pReq.headers as any)['x-correlation-id'],
          receivedAuth: (pReq.headers as any).authorization,
        },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeTruthy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      correlationId: 'foo123',
      receivedAuth: 'Bearer token1',
    });
  });

  test('send success, with beforeSendRequest', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup({
      beforeSendRequest: async (pReq, token) => {
        // eslint-disable-next-line no-param-reassign
        pReq.headers['x-token-issuer'] = token.issuer;
        return Promise.resolve();
      },
    });
    const req: IHttpRequest = {
      headers: {
        'x-correlation-id': 'foo123',
      },
      url: 'https://api.zorg.ca/foo/bar',
    };
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => ({
        body: {
          correlationId: (pReq.headers as any)['x-correlation-id'],
          receivedAuth: (pReq.headers as any).authorization,
          tokenIssuer: (pReq.headers as any)['x-token-issuer'],
        },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeTruthy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      correlationId: 'foo123',
      receivedAuth: 'Bearer token1',
      tokenIssuer: 'https://fake.token.issuer',
    });
  });

  test('send error, with beforeSendRequest crashing', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup({
      beforeSendRequest: async (pReq, token) => {
        return Promise.reject(new Error('Some error...'));
      },
    });
    const req: IHttpRequest = {
      headers: {
        'x-correlation-id': 'foo123',
      },
      url: 'https://api.zorg.ca/foo/bar',
    };
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => ({
        body: {
          correlationId: (pReq.headers as any)['x-correlation-id'],
          receivedAuth: (pReq.headers as any).authorization,
          tokenIssuer: (pReq.headers as any)['x-token-issuer'],
        },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    try {
      // act
      await oidcHttpClient.send(req);
      throw new Error('expected error');
    } catch (err) {
      // expect
      expect(await session.hasToken()).toBeTruthy();
      expect(err.message).toBe('Some error...');
    }
  });

  test('send error, 404', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      url: 'https://api.zorg.ca/foo/bar',
    };
    let callCount = 0;
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => {
        callCount += 1;
        return {
          statusCode: 404,
        };
      },
    });
    expect(await session.hasToken()).toBeFalsy();
    try {
      // act
      await oidcHttpClient.send(req);
      throw new Error('expected error');
    } catch (err) {
      // expect
      expect(await session.hasToken()).toBeTruthy();
      expect(err).toBeInstanceOf(HttpClientError);
      expect(err.statusCode).toBe(404);
      expect(callCount).toBe(1);
    }
  });

  // tslint:disable-next-line: max-line-length
  test('send error, 401, should delete token and be retried only once, with retries=3', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      retries: 3,
      url: 'https://api.zorg.ca/foo/bar',
    };
    let callCount = 0;
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => {
        callCount += 1;
        return {
          statusCode: 401,
        };
      },
    });
    expect(await session.hasToken()).toBeFalsy();
    try {
      // act
      await oidcHttpClient.send(req);
      throw new Error('expected error');
    } catch (err) {
      // expect
      expect(await session.hasToken()).toBeFalsy();
      expect(err).toBeInstanceOf(HttpClientError);
      expect(err.statusCode).toBe(401);
      expect(callCount).toBe(2);
    }
  });

  // tslint:disable-next-line: max-line-length
  test('send error, 401, should delete token and be retried only once, with retries=undefined', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      url: 'https://api.zorg.ca/foo/bar',
    };
    let callCount = 0;
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => {
        callCount += 1;
        return {
          statusCode: 401,
        };
      },
    });
    expect(await session.hasToken()).toBeFalsy();
    try {
      // act
      await oidcHttpClient.send(req);
      throw new Error('expected error');
    } catch (err) {
      // expect
      expect(await session.hasToken()).toBeFalsy();
      expect(err).toBeInstanceOf(HttpClientError);
      expect(err.statusCode).toBe(401);
      expect(callCount).toBe(2);
    }
  });

  test('send should fail once, be retried and succeed', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup({
      retryUnauthenticatedRequests: true,
    });
    const req: IHttpRequest = {
      url: 'https://api.zorg.ca/foo/bar',
    };
    let callCount = 0;
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => {
        callCount += 1;
        if (callCount === 1) {
          return { statusCode: 401 };
        }
        return {
          body: { receivedAuth: (pReq.headers as any).authorization },
          statusCode: 200,
        };
      },
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeTruthy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ receivedAuth: 'Bearer token2' });
    expect(callCount).toBe(2);
  });

  test('send should fail once, and not be retried when option is disabled', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup({
      retryUnauthenticatedRequests: false,
    });
    const req: IHttpRequest = {
      url: 'https://api.zorg.ca/foo/bar',
    };
    let callCount = 0;
    httpClient.register({
      accepts: pReq =>
        pReq.url === req.url &&
        pReq.headers !== undefined &&
        pReq.headers.authorization !== undefined,
      returns: pReq => {
        callCount += 1;
        if (callCount === 1) {
          return { statusCode: 401 };
        }
        return {
          body: { receivedAuth: (pReq.headers as any).authorization },
          statusCode: 200,
        };
      },
    });
    expect(await session.hasToken()).toBeFalsy();
    try {
      // act
      await oidcHttpClient.send(req);
      throw new Error('expected error');
    } catch (err) {
      // expect
      expect(await session.hasToken()).toBeTruthy();
      expect(err.statusCode).toBe(401);
      expect(callCount).toBe(1);
    }
  });

  test('send should not authenticate if onAcceptRequest rejects req', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      url: 'https://www.zorg.ca/foo/bar',
    };
    httpClient.register({
      accepts: pReq => pReq.url === req.url,
      returns: pReq => ({
        body: { message: 'OK' },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeFalsy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ message: 'OK' });
  });

  test('send should not authenticate if urlFilter rejects req', async () => {
    // setup
    const { oidcHttpClient, httpClient, session } = setup();
    const req: IHttpRequest = {
      url: 'https://api.zorg.ca/foo/other',
    };
    httpClient.register({
      accepts: pReq => pReq.url === req.url,
      returns: pReq => ({
        body: { message: 'OK' },
        statusCode: 200,
      }),
    });
    expect(await session.hasToken()).toBeFalsy();
    // act
    const resp = await oidcHttpClient.send(req);
    // expect
    expect(await session.hasToken()).toBeFalsy();
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ message: 'OK' });
  });
});

function setup(options: ISetupOptions = {}) {
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
  const authenticatorConfig: IOidcAuthenticatorConfig = {
    retryUnauthenticatedRequests: options.retryUnauthenticatedRequests,
    onAcceptRequest: req => req.url.startsWith('https://api.zorg.ca/'),
    urlFilter: /^.+\/foo\/bar$/,
    beforeSendRequest: options.beforeSendRequest,
  };
  const oidcHttpClient = new OidcHttpClient(
    httpClient,
    session,
    authenticatorConfig,
  );
  return {
    httpClient,
    logger,
    oidcHttpClient,
    session,
    timeProvider,
    tokenProvider,
  };
}
