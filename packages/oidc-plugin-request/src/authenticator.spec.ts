/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeTimeProvider,
  HttpRequestCorrelator,
  FakeLogger,
  IHttpRequestCorrelator,
} from '@villedemontreal/auth-core';
import {
  FakeTokenProvider,
  InMemoryTokenStore,
  IOidcAuthenticatorConfig,
  IOidcClientConfig,
  IOidcSessionConfig,
  OidcSessionState,
  TokenSet,
} from '@villedemontreal/auth-oidc';
import bodyParser from 'body-parser';
import express from 'express';
import { Server } from 'http';
// import * as request from 'request-promise-native';
import * as request from 'request';
import { createSession } from './createSession';
import { authenticator, canApplyAuthenticator } from './authenticator';
import { requestLogger } from './requestLogger';
import { requestCorrelator } from './requestCorrelator';
import { makeRequestPlugin } from './makeRequestPlugin';
import {
  authInterceptor,
  requestCorrelationInterceptor,
  requestLoggingInterceptor,
} from './interceptors';

interface ExtendedCoreOptions extends request.CoreOptions {
  simple?: boolean;
  resolveWithFullResponse?: boolean;
  transform2xxOnly?: boolean;
}

interface ISetupOptions {
  retryUnauthenticatedRequests?: boolean;
  forceErrorCode?: number;
  beforeSendRequest?: (req: any, token: TokenSet) => Promise<void>;
}

// this function implements the same behaviour as the one provided by
// the 'request-promise-native' module.
function promisify(
  uri: string,
  method: string,
  options?: ExtendedCoreOptions,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const params = { ...options, method };
    params.callback = (err, res, body) => {
      if (err) {
        // eslint-disable-next-line no-param-reassign
        err.response = res;
        reject(err);
      } else if (
        options?.simple !== false &&
        res &&
        !(res.statusCode >= 200 && res.statusCode < 300)
      ) {
        const myError: any = new Error(
          `${res.statusCode} - "${res.statusMessage}"`,
        );
        myError.response = res;
        myError.req = res.request;
        myError.body = body;
        reject(myError);
      } else if (options?.resolveWithFullResponse === true) {
        resolve(res);
      } else {
        resolve(body);
      }
    };
    request.default(uri, params);
  });
}

function httpGet(uri: string, options?: ExtendedCoreOptions) {
  // return request.get(uri, options);
  return promisify(uri, 'GET', options);
}

function httpPost(uri: string, options?: ExtendedCoreOptions) {
  return promisify(uri, 'POST', options);
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

  describe('Promise errors', () => {
    describe('with simple = false', () => {
      describe('with resolveWithFullResponse = false', () => {
        test('should receive a 400 message in the body', async () => {
          // setup
          const options: ExtendedCoreOptions = {
            simple: false,
            resolveWithFullResponse: false,
          };
          // act
          const res = await httpGet(
            'http://localhost:4000/api/error/400',
            options,
          );
          // expect
          expect(res).toBe('Bad Request');
          expect(requestCounter).toBe(1);
        });
      });

      describe('with resolveWithFullResponse = true', () => {
        test('should receive a 400 status code', async () => {
          // setup
          const options: ExtendedCoreOptions = {
            simple: false,
            resolveWithFullResponse: true,
          };
          // act
          const res = await httpGet(
            'http://localhost:4000/api/error/400',
            options,
          );
          // expect
          expect(res.statusCode).toBe(400);
          expect(requestCounter).toBe(1);
        });
      });
    });
    describe('with simple = true', () => {
      describe('with resolveWithFullResponse = false', () => {
        test('should throw an error', async () => {
          // setup
          const options: ExtendedCoreOptions = {
            simple: true,
            resolveWithFullResponse: false,
          };
          // act
          try {
            await httpGet('http://localhost:4000/api/error/400', options);
            throw new Error('Expected error');
          } catch (err) {
            expect(err.message).toBe('400 - "Bad Request"');
          }
          expect(requestCounter).toBe(1);
        });
      });
      describe('with resolveWithFullResponse = true', () => {
        test('should throw an error', async () => {
          // setup
          const options: ExtendedCoreOptions = {
            simple: true,
            resolveWithFullResponse: true,
          };
          // act
          try {
            await httpGet('http://localhost:4000/api/error/400', options);
            throw new Error('Expected error');
          } catch (err) {
            expect(err.message).toBe('400 - "Bad Request"');
          }
          expect(requestCounter).toBe(1);
        });
      });
    });
  });

  test('should not inject token if already provided in auth header', async () => {
    // setup
    const { session, states } = setup();
    const options: ExtendedCoreOptions = {
      headers: {
        authorization: 'Bearer custom',
      },
      resolveWithFullResponse: true,
      simple: false,
    };
    authenticator(session).bind(options);
    makeRequestPlugin({}).bind(options); // add dummy plugin to test case where plugin has no onStart
    // act
    const res = await httpGet('http://localhost:4000/api/secured', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.request.headers.authorization).toBe('Bearer custom');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([]);
  });

  test('should not inject token if onAcceptRequest rejects req', async () => {
    // setup
    const { session, states, authenticatorConfig } = setup();
    const options: ExtendedCoreOptions = { resolveWithFullResponse: true };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    const res = await httpGet('http://localhost:4000/other/text', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(requestCounter).toBe(1);
    expect(states).toEqual([]);
  });

  test('should not inject token if urlFilter rejects req', async () => {
    // setup
    const { session, states, authenticatorConfig } = setup();
    const options: ExtendedCoreOptions = { resolveWithFullResponse: true };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    const res = await httpGet('http://localhost:4000/api/anonymous', options);
    // expect
    expect(res.statusCode).toEqual(200);
    expect(requestCounter).toBe(1);
    expect(states).toEqual([]);
  });

  test('should work when a new token can be acquired', async () => {
    // setup
    const { session, states } = setup();
    const options: ExtendedCoreOptions = { resolveWithFullResponse: true };
    authenticator(session).bind(options);
    // act
    const res = await httpGet('http://localhost:4000/api/secured', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.request.headers.authorization).toBe('Bearer token1');
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
        pReq.setHeader('x-token-issuer', token.issuer);
        return Promise.resolve();
      },
    });
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    const res = await httpGet('http://localhost:4000/api/secured', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.request.headers.authorization).toBe('Bearer token1');
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
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    try {
      await httpGet('http://localhost:4000/api/secured', options);
      throw new Error('Expected error');
    } catch (err) {
      // expect
      expect(err.message).toBe('Some error...');
      expect(err.req.headers.authorization).toBe('Bearer token1');
      expect(requestCounter).toBe(0);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.tokenAcquired,
      ]);
    }
  });

  test('should fail when a new token cannot be acquired', async () => {
    // setup
    const { session, states, tokenProvider, authenticatorConfig } = setup();
    tokenProvider.canProduceTokens = false;
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    try {
      await httpGet('http://localhost:4000/api/secured', options);
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
    const {
      session,
      states,
      timeProvider,
      tokenStore,
      authenticatorConfig,
    } = setup();
    // inject a bad token in the store in order to cause the initial http call to fail with a 401
    const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
    tokenStore.add(badToken);
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    try {
      await httpGet('http://localhost:4000/api/secured', options);
      throw new Error('Expected 401 error');
    } catch (err) {
      // expect
      expect(err.response.statusCode).toBe(401);
      expect(err.response.req.getHeader('authorization')).toBe(
        'Bearer bad-token',
      );
      expect(requestCounter).toBe(1);
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeFalsy();
    }
  });

  test.skip('should fail and retry successfully', async () => {
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
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    const res = await httpGet('http://localhost:4000/api/secured', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.req.getHeader('authorization')).toBe('Bearer token1');
    expect(requestCounter).toBe(2);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    expect(await session.hasToken()).toBeTruthy();
  });

  // test('should fail and retry successfully, without authenticatorConfig', async () => {
  //   // setup
  //   const { session, states, timeProvider, tokenStore } = setup({
  //     retryUnauthenticatedRequests: true,
  //   });
  //   // inject a bad token in the store in order to cause the initial http call to fail with a 401
  //   // and have it retried with a new and valid token.
  //   const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
  //   tokenStore.add(badToken);
  //   // act
  //   const agent = axios.create();
  //   authenticator(session).bind(agent);
  //   const req = agent.get('http://localhost:4000/api/secured');
  //   const res = await req;
  //   // expect
  //   expect(res.status).toBe(200);
  //   expect(res.config.headers.authorization).toBe('Bearer token1');
  //   expect(requestCounter).toBe(2);
  //   expect(states).toEqual([
  //     OidcSessionState.acquiringToken,
  //     OidcSessionState.tokenAcquired,
  //   ]);
  //   expect(await session.hasToken()).toBeTruthy();
  // });

  // test('should fail when renew token fails', async () => {
  //   // setup
  //   const {
  //     session,
  //     states,
  //     timeProvider,
  //     tokenStore,
  //     tokenProvider,
  //     authenticatorConfig,
  //   } = setup({ retryUnauthenticatedRequests: true });
  //   // inject a bad token in the store in order to cause the initial http call to fail with a 401
  //   const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
  //   tokenStore.add(badToken);
  //   tokenProvider.canProduceTokens = false;
  //   // act
  //   const agent = axios.create();
  //   authenticator(session, authenticatorConfig).bind(agent);
  //   const req = agent.get('http://localhost:4000/api/secured');
  //   try {
  //     await req;
  //     throw new Error('Expected 401 error');
  //   } catch (err) {
  //     // expect
  //     expect(err.message).toBe('Could not get token');
  //     expect(err.config).toBeUndefined();
  //     expect(requestCounter).toBe(1);
  //     expect(states).toEqual([
  //       OidcSessionState.acquiringToken,
  //       OidcSessionState.error,
  //     ]);
  //     expect(await session.hasToken()).toBeFalsy();
  //   }
  // });

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
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    try {
      await httpGet('http://localhost:4000/api/secured', options);
      throw new Error('Expected 401 error');
    } catch (err) {
      // expect
      expect(err.response.statusCode).toBe(401);
      expect(err.req.getHeader('authorization')).toBe('Bearer bad-token');
      expect(requestCounter).toBe(1); // 1 because we don't have 'retry' implemented.
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeTruthy();
    }
  });

  test('should rethrow errors in plugins/onComplete after the completion of the request', async () => {
    // setup
    setup();
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    makeRequestPlugin({
      onComplete(
        req: request.Request,
        response: request.Response,
        body?: undefined,
      ) {
        return Promise.reject(new Error('Some error...'));
      },
    }).bind(options);
    // act
    try {
      await httpGet('http://localhost:4000/api/anonymous', options);
      throw new Error('Expected error');
    } catch (err) {
      // expect
      expect(err.response.statusCode).toBe(200);
      expect(requestCounter).toBe(1);
      expect(err.message).toBe('Some error...');
    }
  });

  test('should rethrow errors in plugins/onError after the completion of the request', async () => {
    // setup
    setup();
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    makeRequestPlugin({
      onError(error: Error, req: request.Request, response?: request.Response) {
        return Promise.reject(new Error('Some error...'));
      },
    }).bind(options);
    // act
    try {
      await httpGet('http://localhost:3999/api/anonymous', options);
      throw new Error('Expected error');
    } catch (err) {
      // expect
      expect(requestCounter).toBe(0);
      expect(err.message).toBe('Some error...');
      expect(err.innerError).toBeDefined();
      expect(err.innerError.message).toBe(
        'connect ECONNREFUSED 127.0.0.1:3999',
      );
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
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    try {
      await httpGet('http://localhost:4000/api/unknown', options);
    } catch (err) {
      // expect
      expect(err.response.statusCode).toBe(404);
      expect(err.req.getHeader('authorization')).toBe('Bearer bad-token');
      expect(requestCounter).toBe(1);
      expect(states).toEqual([]);
      expect(await session.hasToken()).toBeTruthy();
    }
  });

  test('should report error on failure', async () => {
    // setup
    const { session, states, authenticatorConfig, logger } = setup({
      retryUnauthenticatedRequests: true,
    });
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session, authenticatorConfig).bind(options);
    requestLogger(logger).bind(options);
    // act
    try {
      await httpGet('http://localhost:3999/api/secured', options);
    } catch (err) {
      // expect
      expect(err.code).toBe('ECONNREFUSED');
      expect(requestCounter).toBe(0);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.tokenAcquired,
      ]);
      expect(await session.hasToken()).toBeTruthy();
      expect(logger.last().logType).toBe('error');
      expect(logger.last().txtMsg).toContain(
        'GET http://localhost:3999/api/secured failed',
      );
    }
  });

  // test('should fail and retry successfully, and maintain specific retry count', async () => {
  //   // setup
  //   const {
  //     session,
  //     states,
  //     timeProvider,
  //     tokenStore,
  //     authenticatorConfig,
  //   } = setup({
  //     forceErrorCode: 500,
  //     retryUnauthenticatedRequests: true,
  //   });
  //   // inject a bad token in the store in order to cause the initial http call to fail with a 401
  //   // and have it retried with a new and valid token.
  //   const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
  //   tokenStore.add(badToken);
  //   // act
  //   try {
  //     const agent = axios.create();
  //     authenticator(session, authenticatorConfig).bind(agent);
  //     retryRequest(2).bind(agent);
  //     const req = agent.get('http://localhost:4000/api/secured');
  //     await req;
  //   } catch (err) {
  //     // expect
  //     expect(err.response.statusCode).toBe(500);
  //     expect(requestCounter).toBe(3);
  //     expect(states).toEqual([]);
  //     expect(await session.hasToken()).toBeTruthy();
  //   }
  // });

  // test('should fail and retry successfully, and maintain specific retry callback', async () => {
  //   // setup
  //   const {
  //     session,
  //     states,
  //     timeProvider,
  //     tokenStore,
  //     authenticatorConfig,
  //   } = setup({
  //     forceErrorCode: 500,
  //     retryUnauthenticatedRequests: true,
  //   });
  //   // inject a bad token in the store in order to cause the initial http call to fail with a 401
  //   // and have it retried with a new and valid token.
  //   const badToken = new TokenSet(timeProvider, 'bad-token', 'Bearer', 300);
  //   tokenStore.add(badToken);
  //   let retryCallbackCalled = false;
  //   try {
  //     // act
  //     const agent = axios.create();
  //     authenticator(session, authenticatorConfig).bind(agent);
  //     retryRequest(2, err => {
  //       retryCallbackCalled = true;
  //       if (err.response && err.response.statusCode === 500) {
  //         return false;
  //       }
  //       return undefined;
  //     }).bind(agent);
  //     const req = agent.get('http://localhost:4000/api/secured');
  //     await req;
  //   } catch (err) {
  //     // expect
  //     expect(err.response.statusCode).toBe(500);
  //     expect(requestCounter).toBe(1);
  //     expect(retryCallbackCalled).toBeTruthy();
  //     expect(states).toEqual([]);
  //     expect(await session.hasToken()).toBeTruthy();
  //   }
  // });

  test('authenticator should not be invoked twice', async () => {
    // setup
    let beforeSendCallCount = 0;
    const { session, states, authenticatorConfig } = setup({
      beforeSendRequest: async (pReq, token) => {
        beforeSendCallCount += 1;
        return Promise.resolve();
      },
    });
    const options: ExtendedCoreOptions = { resolveWithFullResponse: true };
    authenticator(session, authenticatorConfig).bind(options);
    // act
    const res = await httpGet('http://localhost:4000/api/secured', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.request.headers.authorization).toBe('Bearer token1');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    expect(beforeSendCallCount).toBe(1);
    expect(canApplyAuthenticator(res.request)).toBeTruthy();
    // canApplyAuthenticator should short circuit and not reevaluate.
    expect(beforeSendCallCount).toBe(1);
  });

  test('correlator should not inject a header if already present', async () => {
    // setup
    const { session, states } = setup();
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
      baseUrl: 'http://localhost:4000',
      headers: {
        'x-correlation-id': 'custom CID',
      },
    };
    authenticator(session).bind(options);
    requestCorrelator(correlationService).bind(options);
    // act
    const req = httpGet('/api/secured', options);
    const res = await req;
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.req.getHeader('authorization')).toBe('Bearer token1');
    expect(res.req.getHeader('x-correlation-id')).toBe('custom CID');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('correlator should not inject a header if there is no current correlation ID', async () => {
    // setup
    const { session, states } = setup();
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
      baseUrl: 'http://localhost:4000',
    };
    const fakeCorrelator: IHttpRequestCorrelator = {
      bind: (target: any) => target,
      getId: () => undefined,
      withId: () => {},
      withIdAsync: () => Promise.resolve(),
    };
    authenticator(session).bind(options);
    requestCorrelator(fakeCorrelator).bind(options);
    // act
    const req = httpGet('/api/secured', options);
    const res = await req;
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.req.getHeader('authorization')).toBe('Bearer token1');
    expect(res.req.getHeader('x-correlation-id')).toBeUndefined();
    expect(requestCounter).toBe(1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
  });

  test('I should be able to use the authenticator in a global agent', async () => {
    // setup
    const { session, states, logger } = setup();
    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      json: true,
    };
    authenticator(session).bind(options);
    requestLogger(logger).bind(options);
    requestCorrelator(correlationService).bind(options);
    const work = async () => {
      const localOptions: ExtendedCoreOptions = {
        ...options,
        baseUrl: 'http://localhost:4000',
        body: { foo: 'bar' },
        json: true,
      };
      // act
      // const req = httpGet('/api/secured', localOptions);
      const req = httpPost('/api/secured', localOptions);
      const res = await req;
      // expect
      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ foo: 'bar' });
      expect(res.req.getHeader('authorization')).toBe('Bearer token1');
      expect(res.req.getHeader('x-correlation-id')).toBe('test-123');
      expect(requestCounter).toBe(1);
      expect(states).toEqual([
        OidcSessionState.acquiringToken,
        OidcSessionState.tokenAcquired,
      ]);
    };
    await correlationService.withIdAsync(work, 'test-123');
  });

  test('interceptors', async () => {
    // setup
    const { session, states, logger } = setup();

    const auth = authInterceptor(session);
    const logging = requestLoggingInterceptor(logger);
    const correlator = requestCorrelationInterceptor(correlationService);

    const options: ExtendedCoreOptions = {
      resolveWithFullResponse: true,
      headers: {
        'x-correlation-id': 'custom CID',
      },
    };
    await auth(options);
    await logging(options);
    await correlator(options);
    // act
    const res = await httpGet('http://localhost:4000/api/secured', options);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.request.headers.authorization).toBe('Bearer token1');
    expect(res.req.getHeader('x-correlation-id')).toBe('custom CID');
    expect(requestCounter).toBe(1);
    expect(states).toEqual([
      OidcSessionState.acquiringToken,
      OidcSessionState.tokenAcquired,
    ]);
    expect(logger.last().logType).toBe('debug');
    expect(logger.last().messageObj.url).toBe(
      'http://localhost:4000/api/secured',
    );
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
      new Date('2019-12-26T17:23:44-05:00'),
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
      onAcceptRequest: req => req.uri.href.indexOf('/api/') > 0,
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
          // eslint-disable-next-line no-console
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

        app.get('/api/error/400', (req, res) => {
          res.sendStatus(400);
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
