/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/* eslint-disable no-new */

import { FakeTimeProvider } from '@villemontreal/auth-core';
import { FakeClaimsProvider } from './FakeClaimsProvider';
import { IClaims } from './IClaims';
import { TokenSet } from './TokenSet';

describe('TokenSet', () => {
  test('create', () => {
    const { token } = createToken();
    expect(token.access_token).toBe('access_token');
    expect(token.id_token).toBe('id_token');
    expect(token.refresh_token).toBe('refresh_token');
    expect(token.token_type).toBe('Bearer');
    expect(token.expires_in).toBe(300);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:38:26.000Z');
    expect(token.hasExpired()).toBeFalsy();
    expect(token.hasClaims()).toBeFalsy();
  });

  test('create without claimsProvider', async () => {
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 5, 21, 14, 33, 56),
    );
    const token = new TokenSet(
      timeProvider,
      'access_token',
      'Bearer',
      300,
      'id_token',
      'refresh_token',
      'openid profile',
    );
    expect(token.access_token).toBe('access_token');
    expect(token.id_token).toBe('id_token');
    expect(token.refresh_token).toBe('refresh_token');
    expect(token.token_type).toBe('Bearer');
    expect(token.scope).toBe('openid profile');
    expect(token.expires_in).toBe(300);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:38:26.000Z');
    expect(token.hasExpired()).toBeFalsy();
    expect(token.hasClaims()).toBeFalsy();
    expect(await token.getClaims()).toEqual({});
    expect(token.hasClaims()).toBeTruthy();
  });

  test('hasExpired', async () => {
    const { token, timeProvider } = createToken();
    expect(token.expires_in).toBe(300);
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:38:26.000Z');
    expect(token.hasExpired()).toBeFalsy();
    timeProvider.offsetBy(400);
    expect(token.hasExpired()).toBeTruthy();
  });

  test('getClaims', async () => {
    const { token } = createToken();
    expect(token.hasClaims()).toBeFalsy();
    const claims = await token.getClaims();
    expect(token.hasClaims()).toBeTruthy();
    expect(claims).toEqual({ foo: 'bar', age: 33 });
    const claims2 = await token.getClaims();
    expect(claims2).toBe(claims);
  });

  test('toJson, without claims', async () => {
    const { token } = createToken();
    expect(token.hasClaims()).toBeFalsy();
    expect(token.toJSON()).toEqual({
      access_token: token.access_token,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      expires_in: token.expires_in,
      id_token: token.id_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type,
      scope: token.scope,
      issuer: token.issuer,
    });
  });

  test('toJson, with claims', async () => {
    const { token } = createToken();
    const claims = await token.getClaims();
    expect(token.toJSON()).toEqual({
      access_token: token.access_token,
      claims,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      expires_in: token.expires_in,
      id_token: token.id_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type,
      scope: token.scope,
      issuer: token.issuer,
    });
  });

  test('toRedactedJson, with claims', async () => {
    const { token } = createToken();
    await token.getClaims();
    expect(token.toRedactedJSON()).toEqual({
      access_token: 'acce...oken',
      createdAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt.toISOString(),
      expires_in: token.expires_in,
      id_token: 'id_t...oken',
      refresh_token: 'refr...oken',
      token_type: token.token_type,
      scope: token.scope,
      issuer: token.issuer,
    });
  });

  test('toAuthorizationString', async () => {
    const { token } = createToken();
    expect(token.hasClaims()).toBeFalsy();
    expect(token.toAuthorizationString()).toBe('Bearer access_token');
  });

  test('expiration offset when expiration <= 5s', () => {
    const { token } = createToken(5);
    expect(token.expires_in).toBe(5);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:34:01.000Z');
  });

  test('expiration offset when expiration <= 20s', () => {
    const { token } = createToken(20);
    expect(token.expires_in).toBe(20);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:34:15.000Z');
  });

  test('expiration offset when expiration <= 60s', () => {
    const { token } = createToken(60);
    expect(token.expires_in).toBe(60);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:34:51.000Z');
  });

  test('expiration offset when expiration <= 300s', () => {
    const { token } = createToken(300);
    expect(token.expires_in).toBe(300);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T18:38:26.000Z');
  });

  test('expiration offset when expiration > 300s', () => {
    const { token } = createToken(5000);
    expect(token.expires_in).toBe(5000);
    expect(token.createdAt.toISOString()).toBe('2019-06-21T18:33:56.000Z');
    expect(token.expiresAt.toISOString()).toBe('2019-06-21T19:56:16.000Z');
  });

  test('you should not pass an empty access_token to the constructor', () => {
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 5, 21, 14, 33, 56),
    );
    expect.assertions(1);
    try {
      new TokenSet(timeProvider, '', '', 100);
    } catch (e) {
      expect(e.message).toBe('Expected to receive an access_token');
    }
  });

  test('you should not pass an empty token_type to the constructor', () => {
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 5, 21, 14, 33, 56),
    );
    expect.assertions(1);
    try {
      new TokenSet(timeProvider, 'some-token', '', 100);
    } catch (e) {
      expect(e.message).toBe('Expected to receive a token_type');
    }
  });

  test('you should not pass a zero expiration to the constructor', () => {
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 5, 21, 14, 33, 56),
    );
    expect.assertions(1);
    try {
      new TokenSet(timeProvider, 'some-token', 'Bearer', 0);
    } catch (e) {
      expect(e.message).toBe('Expected expires_in to be >= 1');
    }
  });

  test('you should not pass a zero expiration to the constructor', () => {
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 5, 21, 14, 33, 56),
    );
    expect.assertions(1);
    try {
      new TokenSet(timeProvider, 'some-token', 'Bearer', -1);
    } catch (e) {
      expect(e.message).toBe('Expected expires_in to be >= 1');
    }
  });

  test('equals with undefined should be false', () => {
    const { token } = createToken();
    const other: any = null;
    expect(token.equals(other as TokenSet)).toBeFalsy();
  });

  test('equals with same to be true', () => {
    const { token } = createToken();
    expect(token.equals(token)).toBeTruthy();
  });

  test('equals with clone to be true', () => {
    const a = createToken();
    const b = createToken();
    expect(a.token.equals(b.token)).toBeTruthy();
  });

  test('equals with different access_token should be false', () => {
    const { token } = createToken();
    const other = new TokenSet(
      token.timeProvider,
      'other',
      token.token_type,
      token.expires_in,
      token.id_token,
      token.refresh_token,
    );
    expect(token.equals(other)).toBeFalsy();
  });

  test('equals with different refresh_token should be false', () => {
    const { token } = createToken();
    const other = new TokenSet(
      token.timeProvider,
      token.access_token,
      token.token_type,
      token.expires_in,
      token.id_token,
      'other',
    );
    expect(token.equals(other)).toBeFalsy();
  });

  test('equals with different token_type should be false', () => {
    const { token } = createToken();
    const other = new TokenSet(
      token.timeProvider,
      token.access_token,
      'other',
      token.expires_in,
      token.id_token,
      token.refresh_token,
    );
    expect(token.equals(other)).toBeFalsy();
  });

  test('equals with different expires_in should be false', () => {
    const { token } = createToken();
    const other = new TokenSet(
      token.timeProvider,
      token.access_token,
      token.token_type,
      111,
      token.id_token,
      token.refresh_token,
    );
    expect(token.equals(other)).toBeFalsy();
  });

  function createToken(expiresIn: number = 300) {
    const claims: IClaims = { foo: 'bar', age: 33 };
    const claimsProvider = new FakeClaimsProvider(claims);
    const timeProvider = new FakeTimeProvider(
      new Date(2019, 5, 21, 14, 33, 56),
    );
    const token = new TokenSet(
      timeProvider,
      'access_token',
      'Bearer',
      expiresIn,
      'id_token',
      'refresh_token',
      'scope',
      claimsProvider,
    );
    return { timeProvider, token };
  }
});
