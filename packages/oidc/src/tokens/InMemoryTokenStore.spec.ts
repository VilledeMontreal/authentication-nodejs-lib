/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { FakeLogger, FakeTimeProvider } from '@villemontreal/auth-core';
import { FakeClaimsProvider } from './FakeClaimsProvider';
import { IClaims } from './IClaims';
import { InMemoryTokenStore } from './InMemoryTokenStore';
import { TokenSet } from './TokenSet';

describe('InMemoryTokenStore', () => {
  test('get / add / delete', async () => {
    // setup
    const { token, store, logger } = setup();

    // act: GET
    const currentTokens = await store.get();

    // expect
    expect(currentTokens).toBeUndefined();

    // act: ADD
    await store.add(token);

    // expect
    expect(await store.get()).toBe(token);
    expect(logger.entries.length).toBe(1);
    expect(logger.entries[0]).toEqual({
      logType: 'debug',
      messageObj: {
        newToken: {
          access_token: 'acce...oken',
          createdAt: '2019-06-21T18:33:56.000Z',
          expiresAt: '2019-06-21T18:38:26.000Z',
          expires_in: 300,
          id_token: 'some...oken',
          refresh_token: 'refr...oken',
          token_type: 'Bearer',
          scope: 'scope',
        },
        oldToken: undefined,
      },
      txtMsg: 'Store token',
    });

    // act: DELETE
    await store.delete(token);

    // expect
    expect(await store.get()).toBeUndefined();
    expect(logger.entries.length).toBe(2);
    expect(logger.entries[1]).toEqual({
      logType: 'debug',
      messageObj: {
        currentToken: {
          access_token: 'acce...oken',
          createdAt: '2019-06-21T18:33:56.000Z',
          expiresAt: '2019-06-21T18:38:26.000Z',
          expires_in: 300,
          id_token: 'some...oken',
          refresh_token: 'refr...oken',
          token_type: 'Bearer',
          scope: 'scope',
        },
        tokenToDelete: {
          access_token: 'acce...oken',
          createdAt: '2019-06-21T18:33:56.000Z',
          expiresAt: '2019-06-21T18:38:26.000Z',
          expires_in: 300,
          id_token: 'some...oken',
          refresh_token: 'refr...oken',
          token_type: 'Bearer',
          scope: 'scope',
        },
      },
      txtMsg: 'Delete token',
    });
  });

  test('add undefined tokens should be ignored and clear the current token', async () => {
    // setup
    const { token, store, logger } = setup();
    await store.add(token);
    expect(await store.get()).not.toBeUndefined();
    // act
    const emptyToken: any = null;
    await store.add(emptyToken as TokenSet);
    // expect
    expect(await store.get()).toBeUndefined();
    expect(logger.last()).toEqual({
      logType: 'debug',
      messageObj: {
        oldToken: token.toRedactedJSON(),
      },
      txtMsg: 'Cannot store token because new token is undefined',
    });
  });

  test('delete undefined tokens should be ignored', async () => {
    // setup
    const logger = new FakeLogger();
    const store = new InMemoryTokenStore(logger);
    const token: any = null;
    // act
    await store.delete(token as TokenSet);
    // expect
    expect(logger.last()).toBeUndefined();
  });

  test('delete token that is not current should be ignored', async () => {
    // setup
    const { logger, token, store, claimsProvider, timeProvider } = setup();
    await store.add(token);
    const currentToken = await store.get();
    expect(currentToken).toBeDefined();
    const otherToken = new TokenSet(
      timeProvider,
      'access_token33',
      'Bearer',
      300,
      'some_id_token33',
      'refresh_token33',
      'scope33',
      claimsProvider,
    );
    logger.reset();
    // act
    await store.delete(otherToken);
    // expect
    expect(await store.get()).toBe(currentToken);
    expect(logger.last()).toBeUndefined();
  });

  function setup() {
    const logger = new FakeLogger();
    const store = new InMemoryTokenStore(logger);
    const claims: IClaims = { foo: 'bar', age: 33 };
    const claimsProvider = new FakeClaimsProvider(claims);
    const timeProvider = new FakeTimeProvider(
      new Date('2019-06-21T14:33:56-04:00'),
    );
    const token = new TokenSet(
      timeProvider,
      'access_token',
      'Bearer',
      300,
      'some_id_token',
      'refresh_token',
      'scope',
      claimsProvider,
    );
    return {
      claims,
      claimsProvider,
      logger,
      store,
      timeProvider,
      token,
    };
  }
});
