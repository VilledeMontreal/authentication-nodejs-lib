/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  DefaultHttpClient,
  deserialize,
  IHttpContext,
  isAlreadySerialized,
  isInvalidStatusCode,
  remapError,
  extractMessageFromError,
} from './DefaultHttpClient';
import { HttpClientError } from './HttpClientError';
import { initHttpClientTestSuite } from './HttpClientTestSuite';
import { NoopLogger } from '../logging/NoopLogger';

describe('DefaultHttpClient', () => {
  initHttpClientTestSuite({
    httpClientFactory: (logger, httpDefaults) =>
      new DefaultHttpClient(logger, httpDefaults),
      express: require('express'),
      bodyParser: require('body-parser'),
    });

  test('the constructor should accept an undefined httpDefaults parameter', () => {
    const client = new DefaultHttpClient(new NoopLogger());
    expect(client).toBeDefined();
  });

  test('isInvalidStatusCode', () => {
    expect(isInvalidStatusCode(undefined)).toBeTruthy();
    expect(isInvalidStatusCode(100)).toBeTruthy();
    expect(isInvalidStatusCode(199)).toBeTruthy();
    expect(isInvalidStatusCode(200)).toBeFalsy();
    expect(isInvalidStatusCode(299)).toBeFalsy();
    expect(isInvalidStatusCode(300)).toBeTruthy();
    expect(isInvalidStatusCode(400)).toBeTruthy();
    expect(isInvalidStatusCode(500)).toBeTruthy();
    expect(isInvalidStatusCode(600)).toBeTruthy();
  });

  test('remapError with code', () => {
    const err = remapError({ message: 'msg', code: 'foo' });
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.message).toEqual('msg');
    expect(err.code).toEqual('foo');
  });

  test('remapError without code', () => {
    const err = remapError({ message: 'msg' });
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.message).toEqual('msg');
    expect(err.code).toEqual('EUNKNOWN');
  });

  test('remapError without error (null)', () => {
    const err = remapError(null);
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.message).toEqual('Unknown error');
    expect(err.code).toEqual('EUNKNOWN');
    expect(err.innerError).toBeNull();
  });

  test('remapError without error (undefined)', () => {
    const err = remapError(undefined);
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.message).toEqual('Unknown error');
    expect(err.code).toEqual('EUNKNOWN');
    expect(err.innerError).toBeUndefined();
  });

  test('isAlreadySerialized', () => {
    expect(isAlreadySerialized({ message: 'msg' })).toBeFalsy();
    expect(isAlreadySerialized('')).toBeTruthy();
    expect(isAlreadySerialized('text')).toBeTruthy();
    expect(isAlreadySerialized(Buffer.from('text'))).toBeTruthy();
    expect(isAlreadySerialized(undefined)).toBeTruthy();
    expect(isAlreadySerialized(null)).toBeTruthy();
  });

  test('deserialize with empty buffer should return null', () => {
    const context: any = null;
    const content = Buffer.from([]);
    expect(deserialize(context as IHttpContext, null, content)).toBeNull();
  });

  test('deserialize without contentType should return the submitted content', () => {
    const context: any = null;
    const content = Buffer.from('foo');
    expect(deserialize(context as IHttpContext, null, content)).toBe(content);
  });

  test('extractMessageFromError should find message', () => {
    const err = new Error('Some error...');
    expect(extractMessageFromError(err)).toBe('Some error...');
  });

  test('extractMessageFromError should use toString if there is no message', () => {
    expect(extractMessageFromError('my error')).toBe('my error');
  });

  test('extractMessageFromError should accept an undefined error', () => {
    expect(extractMessageFromError(undefined)).toBe('Unknown error');
  });
});
