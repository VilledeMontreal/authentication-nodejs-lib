/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  delay,
  FakeLogger,
  FakeTimeProvider,
  IHttpDefaults,
  FakeHttpRequestCorrelator,
} from '@villedemontreal/auth-core';
import { FakeTokenProvider } from '../tokens/FakeTokenProvider';
import { TokenSet } from '../tokens/TokenSet';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcSessionBuilder } from './OidcSessionBuilder';
import { OidcSessionState } from './OidcSessionState';

interface ISetupOptions {
  scheduleRefresh?: boolean;
  canGenerateRefreshTokens?: boolean;
  httpDefaults?: IHttpDefaults;
}

describe('OidcSessionState', () => {
  test('should refresh a token when it has expired', async () => {
    // setup
    const { session, timeProvider, states, tokens } = setup();
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    // act
    const token1 = await session.getToken();
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    // make sure that we get the same token while is hasn't expired
    expect(await session.getToken()).toBe(token1);
    // expire token and refresh
    timeProvider.offsetBy(350);
    expect(token1.hasExpired()).toBeTruthy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenExpired);
    // act
    const token2 = await session.getToken();
    // expect
    expect(token2).toBeDefined();
    expect(token2.access_token).toBe('token2');
    expect(token2.refresh_token).toBe('refreshtoken2');
    expect(token2.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(token2).not.toBe(token1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken,
      OidcSessionState.tokenAcquired,
    ]);
    expect(tokens).toEqual([token1, token2]);
  });

  test('should refresh a token when it has expired, even without refresh_token', async () => {
    // setup
    const { session, timeProvider, states } = setup({
      canGenerateRefreshTokens: false,
    });
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    // act
    const token1 = await session.getToken();
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBeUndefined();
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    // make sure that we get the same token while is hasn't expired
    expect(await session.getToken()).toBe(token1);
    // expire token and refresh
    timeProvider.offsetBy(350);
    expect(token1.hasExpired()).toBeTruthy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenExpired);
    // act
    const token2 = await session.getToken();
    // expect
    expect(token2).toBeDefined();
    expect(token2.access_token).toBe('token2');
    expect(token2.refresh_token).toBeUndefined();
    expect(token2.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(token2).not.toBe(token1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('force refresh a token before it has expired', async () => {
    // setup
    const { session, states } = setup();
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    const token1 = await session.getToken();
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    // act
    const token2 = await session.forceRefreshToken();
    // expect
    expect(token2).toBeDefined();
    expect(token2.access_token).toBe('token2');
    expect(token2.refresh_token).toBe('refreshtoken2');
    expect(token2.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(token2).not.toBe(token1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('should request new token when refresh_token fails', async () => {
    // setup
    const { session, timeProvider, tokenProvider, states } = setup();
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    expect(session.sessionConfig.canUseRefreshTokens).toBeTruthy();
    // act
    const token1 = await session.getToken();
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    // expire token and refresh
    timeProvider.offsetBy(350);
    expect(token1.hasExpired()).toBeTruthy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenExpired);
    // act
    tokenProvider.canProduceRefreshTokens = false;
    const token2 = await session.getToken();
    // expect
    expect(token2).toBeDefined();
    expect(token2.access_token).toBe('token2');
    expect(token2.refresh_token).toBe('refreshtoken2');
    expect(token2.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(token2).not.toBe(token1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken,
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  async function scheduleRefreshTokenBeforeItExpires(
    httpDefaults?: IHttpDefaults,
  ) {
    // setup
    const { session, tokenProvider, states } = setup({
      httpDefaults,
      scheduleRefresh: true,
    });
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    tokenProvider.expirationInSecs = 1;
    // act
    const token1 = await session.getToken();
    await session.getToken(); // another time to allow automatic refresh
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    // act
    await delay(token1.expires_in * 1000 + 10); // wait until token expires
    // expect
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken, // refresh starts here
    ]);
    await delay(100); // wait until refresh completes
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken, // refresh starts here
      OidcSessionState.tokenAcquired, // refresh is done
    ]);
    // there should not be any additional refresh when getting the token
    const token2 = await session.getToken();
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken,
      OidcSessionState.tokenAcquired,
    ]);
    expect(token2).toBeDefined();
    expect(token2.access_token).toBe('token2');
    expect(token2.refresh_token).toBe('refreshtoken2');
    expect(token2.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(token2).not.toBe(token1);
  }

  test('should schedule a refresh of token before it expires, wihtout Correlator', async () => {
    scheduleRefreshTokenBeforeItExpires();
  });

  test('should schedule a refresh of token before it expires, with Correlator', async () => {
    const correlator = new FakeHttpRequestCorrelator('foo');
    scheduleRefreshTokenBeforeItExpires({ correlator });
  });

  test('should not schedule a refresh if the current token was never used', async () => {
    // setup
    const { session, tokenProvider, states, timeProvider } = setup({
      scheduleRefresh: true,
    });
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    tokenProvider.expirationInSecs = 1;
    // act
    const token1 = await session.getToken();
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    // act
    await delay(token1.expires_in * 1100); // wait until token expires
    // expect
    timeProvider.offsetBy(2);
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenExpired);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('a failed scheduled refresh should swallow the error', async () => {
    // setup
    const { session, tokenProvider, states, logger } = setup({
      scheduleRefresh: true,
    });
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    tokenProvider.expirationInSecs = 1;
    // act
    const token1 = await session.getToken();
    await session.getToken(); // another time to allow automatic refresh
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    tokenProvider.canProduceRefreshTokens = false;
    tokenProvider.canProduceTokens = false;
    // act
    await delay(token1.expires_in * 1000 + 100); // wait until token expires
    // expect
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken, // refresh starts here
      OidcSessionState.acquiringToken, // because previous refresh token attempt failed
      OidcSessionState.error, // refresh failed
    ]);
    const last = logger.last();
    delete last.messageObj.stack;
    expect(last).toEqual({
      logType: 'error',
      messageObj: {
        name: 'Error',
        message: 'Could not get token',
      },
      txtMsg: 'Could not refresh token from timer',
    });
  });

  test('state should be error when no token could be acquired', async () => {
    // setup
    const { session, tokenProvider } = setup();
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    expect(session.sessionConfig.canUseRefreshTokens).toBeTruthy();
    tokenProvider.canProduceRefreshTokens = false;
    tokenProvider.canProduceTokens = false;
    try {
      // act
      await session.getToken();
      throw new Error('expected token failure');
    } catch (e: any) {
      // expect
      expect(e.message).toBe('Could not get token');
      expect(await session.getState()).toBe(OidcSessionState.error);
    }
  });

  test('should serialize concurrent token requests', async () => {
    // setup
    const { session } = setup();
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    // act
    const req1 = session.getToken();
    const res2 = await session.getToken();
    const res1 = await req1;
    // expect
    expect(res1.access_token).toBe('token1');
    expect(res1.refresh_token).toBe('refreshtoken1');
    expect(res2.access_token).toBe('token1');
    expect(res2.refresh_token).toBe('refreshtoken1');
    expect(res1).toBe(res2);
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    // make sure that we get the same token while is hasn't expired
    expect(await session.getToken()).toBe(res1);
  });

  // tslint:disable-next-line: max-line-length
  test('should serialize concurrent token request while a scheduled refresh is in progress', async () => {
    // setup
    const { session, tokenProvider, states, timeProvider } = setup({
      scheduleRefresh: true,
    });
    expect(await session.getState()).toBe(OidcSessionState.uninitialized);
    expect(await session.hasToken()).toBeFalsy();
    tokenProvider.expirationInSecs = 1;
    // act
    const token1 = await session.getToken();
    await session.getToken(); // another time to allow automatic refresh
    // expect
    expect(token1).toBeDefined();
    expect(token1.access_token).toBe('token1');
    expect(token1.refresh_token).toBe('refreshtoken1');
    expect(token1.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    // act
    await delay(token1.expires_in * 1000 + 10); // wait until token expires
    // expect
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken, // refresh starts here
    ]);
    // the token request should receive the scheduled refreshed token
    timeProvider.offsetBy(token1.expires_in + 1); // make sure that the current tokens have expired
    const token2 = await session.getToken();
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
      OidcSessionState.refreshingToken, // refresh starts here
      OidcSessionState.tokenAcquired, // refresh is done
    ]);
    expect(token2).toBeDefined();
    expect(token2.access_token).toBe('token2');
    expect(token2.refresh_token).toBe('refreshtoken2');
    expect(token2.hasExpired()).toBeFalsy();
    expect(await session.hasToken()).toBeTruthy();
    expect(await session.getState()).toBe(OidcSessionState.tokenAcquired);
    expect(token2).not.toBe(token1);
  });
});

test('delete existing token should clear tokenStore', async () => {
  // setup
  const { session } = setup();
  const token = await session.getToken();
  expect(token).toBeDefined();
  expect(await session.hasToken()).toBeTruthy();
  // act
  await session.deleteToken(token);
  // expect
  expect(await session.hasToken()).toBeFalsy();
  expect(await session.getToken()).not.toBe(token);
});

test('delete token that is not current should be ignored', async () => {
  // setup
  const { session, timeProvider } = setup();
  const token = await session.getToken();
  expect(token).toBeDefined();
  expect(await session.hasToken()).toBeTruthy();
  const otherTokens = new TokenSet({
    timeProvider,
    access_token: 'other-token',
    token_type: 'Bearer',
    expires_in: 222,
    id_token: 'other-id',
    refresh_token: 'other-refresh',
  });
  // act
  await session.deleteToken(otherTokens);
  // expect
  expect(await session.hasToken()).toBeTruthy();
  expect(await session.getToken()).toBe(token);
});

function setup(options: ISetupOptions = {}) {
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
  const logger = new FakeLogger();
  const timeProvider = new FakeTimeProvider(
    new Date('2019-12-26T17:23:44-05:00'),
  );
  const tokenProvider = new FakeTokenProvider(timeProvider);
  if (options.canGenerateRefreshTokens !== undefined) {
    tokenProvider.canGenerateRefreshTokens = options.canGenerateRefreshTokens;
  }
  const sessionConfig: IOidcSessionConfig = {
    canUseRefreshTokens: true,
    factory: {
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
    scheduleRefresh: options.scheduleRefresh,
    httpDefaults: options.httpDefaults,
  };
  const session = builder.buildSession(clientConfig, sessionConfig);
  const states: OidcSessionState[] = [];
  session.on('stateChanged', state => {
    states.push(state);
  });
  const tokens: TokenSet[] = [];
  session.on('token', token => {
    tokens.push(token);
  });
  return {
    logger,
    session,
    states,
    timeProvider,
    tokenProvider,
    tokens,
  };
}
