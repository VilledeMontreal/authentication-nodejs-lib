/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeTimeProvider,
  HttpRequestCorrelator,
  FakeLogger,
} from '@villemontreal/auth-core';
import {
  FakeTokenProvider,
  InMemoryTokenStore,
  IOidcAuthenticatorConfig,
  IOidcClientConfig,
  IOidcSessionConfig,
  OidcSessionState,
  TokenSet,
} from '@villemontreal/auth-oidc';
import bodyParser from 'body-parser';
import express from 'express';
import { Server } from 'http';
import * as superagent from 'superagent';
import { createSession } from './createSession';
import { authenticator } from './authenticator';
import { requestLogger } from './requestLogger';
import { requestCorrelator } from './requestCorrelator';

interface ISetupOptions {
  retryUnauthenticatedRequests?: boolean;
  forceErrorCode?: number;
  beforeSendRequest?: (req: any, token: TokenSet) => Promise<void>;
}

describe('authenticator', () => {
  let server: Server;
  let setupOptions: ISetupOptions | undefined;
  let requestCounter = 0;
  const correlationService = new HttpRequestCorrelator();

  beforeAll(async () => {
    server = await createSampleApi();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    setupOptions = undefined;
    requestCounter = 0;
  });

  test('should not inject token if already provided in auth header', async () => {
    // setup
    const { session, states } = setup();
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .set('authorization', 'Bearer custom')
      .use(authenticator(session));
    const res = await req;
    // expect
    expect(res.status).toBe(200);
    expect(req.get('authorization')).toBe('Bearer custom');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([]);
  });

  test('should not inject token if onAcceptRequest rejects req', async () => {
    // setup
    const { session, states, authenticatorConfig } = setup();
    // act
    const req = superagent
      .get('http://localhost:4000/other/text')
      .use(authenticator(session, authenticatorConfig));
    const res = await req;
    // expect
    expect(res.status).toBe(200);
    expect(requestCounter).toBe(1);
    expect(states).toEqual([]);
  });

  test('should not inject token if urlFilter rejects req', async () => {
    // setup
    const { session, states, authenticatorConfig } = setup();
    // act
    const req = superagent
      .get('http://localhost:4000/api/anonymous')
      .use(authenticator(session, authenticatorConfig));
    const res = await req;
    // expect
    expect(res.status).toBe(200);
    expect(requestCounter).toBe(1);
    expect(states).toEqual([]);
  });

  test('should work when a new token can be acquired', async () => {
    // setup
    const { session, states } = setup();
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session));
    const res = await req;
    // expect
    expect(res.status).toBe(200);
    expect(req.get('authorization')).toBe('Bearer token1');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('should work with beforeSendRequest', async () => {
    // setup
    const { session, states, authenticatorConfig } = setup({
      beforeSendRequest: async (pReq, token) => {
        pReq.set('x-token-issuer', token.issuer);
        return Promise.resolve();
      },
    });
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session, authenticatorConfig));
    const res = await req;
    // expect
    expect(res.status).toBe(200);
    expect(req.get('authorization')).toBe('Bearer token1');
    expect(res.body.tokenIssuer).toBe('https://fake.token.issuer');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('should fail with beforeSendRequest crashing', async () => {
    // setup
    const { session, states, authenticatorConfig } = setup({
      beforeSendRequest: async (pReq, token) => {
        return Promise.reject(new Error('Some error...'));
      },
    });
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session, authenticatorConfig));
    try {
      await req;
      throw new Error('Expected error');
    } catch (err) {
      // expect
      expect(err.message).toBe('Some error...');
      expect(req.get('authorization')).toBe('Bearer token1');
      expect(requestCounter).toBe(0);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.tokenAcquired,
      ]);
    }
  });

  test('should fail when a new token cannot be acquired', async () => {
    // setup
    const { session, states, tokenProvider } = setup();
    tokenProvider.canProduceTokens = false;
    // act
    try {
      await superagent
        .get('http://localhost:4000/api/secured')
        .use(authenticator(session));
      throw new Error('expected 401 error');
    } catch (err) {
      // expect
      expect(err.message).toBe('Could not get token');
      expect(requestCounter).toBe(0);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.error,
      ]);
    }
  });

  // tslint:disable-next-line: max-line-length
  test('should fail and not retry if the current token was invalid and retry is disabled', async () => {
    // setup
    const { session, states, timeProvider, tokenStore } = setup();
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session));
    try {
      await req;
      throw new Error('Expected 401 error');
    } catch (err) {
      // expect
      expect(err.status).toBe(401);
      expect(req.get('authorization')).toBe('Bearer bad-token');
      expect(requestCounter).toBe(1);
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeFalsy();
    }
  });

  test('should fail and retry successfully', async () => {
    // setup
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      authenticatorConfig,
    } = setup({ retryUnauthenticatedRequests: true });
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    // and have it retried with a new and valid token.
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session, authenticatorConfig));
    const res = await req;
    // expect
    expect(res.status).toBe(200);
    expect(req.get('authorization')).toBe('Bearer token1');
    expect(requestCounter).toBe(2);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    expect(await session.hasToken()).toBeTruthy();
  });

  test('should fail when renew token fails', async () => {
    // setup
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      tokenProvider,
      authenticatorConfig,
    } = setup({ retryUnauthenticatedRequests: true });
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    tokenProvider.canProduceTokens = false;
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session, authenticatorConfig));
    try {
      await req;
      throw new Error('Expected 401 error');
    } catch (err) {
      // expect
      expect(err.status).toBe(401);
      expect(req.get('authorization')).toBe('Bearer bad-token');
      expect(requestCounter).toBe(2);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.error,
        OidcSessionState.acquiringToken,
        OidcSessionState.error,
      ]);
      expect(await session.hasToken()).toBeFalsy();
    }
  });

  test('should ignore when delete token fails', async () => {
    // setup
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      tokenProvider,
      authenticatorConfig,
    } = setup({ retryUnauthenticatedRequests: true });
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    tokenProvider.canProduceTokens = false;
    tokenStore.delete = token => {
      throw new Error('Cannot delete token');
    };
    // act
    const req = superagent
      .get('http://localhost:4000/api/secured')
      .use(authenticator(session, authenticatorConfig));
    try {
      await req;
      throw new Error('Expected 401 error');
    } catch (err) {
      // expect
      expect(err.status).toBe(401);
      expect(req.get('authorization')).toBe('Bearer bad-token');
      expect(requestCounter).toBe(2);
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeTruthy();
    }
  });

  test('should fail and not retry for a 404', async () => {
    // setup
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      authenticatorConfig,
    } = setup({ retryUnauthenticatedRequests: true });
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    // and have it retried with a new and valid token.
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    // act
    const req = superagent
      .get('http://localhost:4000/api/unknown')
      .use(authenticator(session, authenticatorConfig));
    try {
      await req;
    } catch (err) {
      // expect
      expect(err.status).toBe(404);
      expect(req.get('authorization')).toBe('Bearer bad-token');
      expect(requestCounter).toBe(1);
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeTruthy();
    }
  });

  test('should fail and retry successfully, and maintain specific retry count', async () => {
    // setup
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      authenticatorConfig,
    } = setup({
      forceErrorCode: 500,
      retryUnauthenticatedRequests: true,
    });
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    // and have it retried with a new and valid token.
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    // act
    try {
      const req = superagent
        .get('http://localhost:4000/api/secured')
        .retry(2)
        .use(authenticator(session, authenticatorConfig));
      await req;
    } catch (err) {
      // expect
      expect(err.status).toBe(500);
      expect(requestCounter).toBe(3);
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeTruthy();
    }
  });

  test('should fail and retry successfully, and maintain specific retry callback', async () => {
    // setup
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      authenticatorConfig,
    } = setup({
      forceErrorCode: 500,
      retryUnauthenticatedRequests: true,
    });
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    // and have it retried with a new and valid token.
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    let retryCallbackCalled = false;
    try {
      // act
      const req = superagent
        .get('http://localhost:4000/api/secured')
        .retry(2, (err, res) => {
          retryCallbackCalled = true;
          if (res && res.status === 500) {
            return false;
          }
          return undefined;
        })
        .use(authenticator(session, authenticatorConfig));
      await req;
    } catch (err) {
      // expect
      expect(err.status).toBe(500);
      expect(requestCounter).toBe(1);
      expect(retryCallbackCalled).toBeTruthy();
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeTruthy();
    }
  });

  test('I should be able to use the authenticator in a global agent', async () => {
    // setup
    const { session, states, logger } = setup();
    const agent = superagent
      .agent()
      .use(authenticator(session))
      .use(requestLogger(logger))
      // .use(requestLogger(new ConsoleLogger(() => correlationService.getId())))
      .use(requestCorrelator(correlationService));
    const work = async () => {
      // act
      const req = agent.get('http://localhost:4000/api/secured');
      const res = await req;
      // expect
      expect(res.status).toBe(200);
      expect(req.get('authorization')).toBe('Bearer token1');
      expect(requestCounter).toBe(1);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.tokenAcquired,
      ]);
    };
    await correlationService.withIdAsync(work);
  });

  function setup(options: ISetupOptions = {}) {
    setupOptions = options;
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'foo',
        secret: 'bar',
      },
      issuer: 'http://localhost:3000',
      scopes: ['openid', 'profile'],
    };
    const logger = new FakeLogger();
    // const logger = new ConsoleLogger(() => correlationService.getId());
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 12, 26, 17, 23, 44),
    );
    const tokenProvider = new FakeTokenProvider(timeProvider);
    const tokenStore = new InMemoryTokenStore(logger);
    const sessionConfig: IOidcSessionConfig = {
      factory: {
        createLogger: () => logger,
        createTokenProvider: (
          pLogger,
          pHttpClient,
          pServerConfigGetter,
          pClaimsProvider,
          pTimeProvider,
          pClientConfig,
        ) => tokenProvider,
        createTokenStore: pLogger => tokenStore,
      },
      httpDefaults: {
        correlator: correlationService,
      },
    };
    const session = createSession(clientConfig, sessionConfig);
    const states: OidcSessionState[] = [];
    session.on('stateChanged', state => {
      states.push(state);
    });
    let retryUnauthenticatedRequests = false;
    if (options.retryUnauthenticatedRequests !== undefined) {
      retryUnauthenticatedRequests = options.retryUnauthenticatedRequests;
    }
    const authenticatorConfig: IOidcAuthenticatorConfig = {
      retryUnauthenticatedRequests,
      onAcceptRequest: req => req.url.indexOf('/api/') > 0,
      urlFilter: /^((?!anonymous).)*$/,
      beforeSendRequest: options.beforeSendRequest,
    };
    return {
      authenticatorConfig,
      clientConfig,
      logger,
      session,
      sessionConfig,
      states,
      timeProvider,
      tokenProvider,
      tokenStore,
    };
  }

  function correlationMiddleware(correlator: HttpRequestCorrelator) {
    return (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const cid = req.headers['x-correlation-id'] as string;
      correlator.withId(next, cid);
    };
  }

  function createSampleApi(): Promise<Server> {
    return new Promise((resolve, reject) => {
      try {
        const app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.text({ type: ['text/plain', 'text/html'] }));

        app.use(correlationMiddleware(correlationService));

        app.use((req, res, next) => {
          requestCounter += 1;
          if (setupOptions && setupOptions.forceErrorCode) {
            res.sendStatus(setupOptions.forceErrorCode);
          } else {
            next();
          }
        });

        app.get('/other/text', (req, res) => {
          res.json({
            message: 'text',
          });
        });

        app.get('/api/anonymous', (req, res) => {
          res.json({
            message: 'hello',
          });
        });

        app.get('/api/secured', (req, res) => {
          if (
            !req.headers.authorization ||
            req.headers.authorization === 'Bearer bad-token'
          ) {
            res.sendStatus(401);
          } else {
            res.json({
              completed: false,
              id: 1,
              title: 'delectus aut autem',
              userId: 1,
              tokenIssuer: req.headers['x-token-issuer'],
            });
          }
        });

        app.post('/api/secured', (req, res) => {
          if (!req.headers.authorization) {
            res.sendStatus(401);
          } else {
            res.status(201).json(req.body);
          }
        });

        const srv = app
          .listen(4000, () => {
            resolve(srv);
          })
          .on('error', err => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }
});
