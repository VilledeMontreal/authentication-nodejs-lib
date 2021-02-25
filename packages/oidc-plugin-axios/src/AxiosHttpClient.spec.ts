/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/* eslint-disable global-require */
/* eslint-disable node/no-unpublished-require */

import {
  HttpClientError,
  initHttpClientTestSuite,
  NoopLogger,
  IHttpContext,
  createDefaultDeserializers,
} from '@villedemontreal/auth-core';
import { remapError, AxiosHttpClient } from './AxiosHttpClient';

describe('AxiosHttpClient', () => {
  initHttpClientTestSuite({
    httpClientFactory: (logger, httpDefaults) =>
      new AxiosHttpClient(logger, httpDefaults),
    express: require('express'),
    bodyParser: require('body-parser'),
  });

  test('the constructor should accept an undefined httpDefaults parameter', () => {
    const client = new AxiosHttpClient(new NoopLogger());
    expect(client).toBeDefined();
  });

  test('remapError, unexpected error', () => {
    const err = remapError(
      new Error('Some error...'),
      createContext('GET', '/foo/bar'),
    );
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBeUndefined();
    expect(err.message).toBe('GET /foo/bar => Some error...');
  });

  test('remapError, with code', () => {
    const original = new Error('Some error...') as any;
    original.code = 'ECONNABORTED';
    const err = remapError(original, createContext('GET', '/foo/bar'));
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBe('ETIMEDOUT');
    expect(err.message).toBe('GET /foo/bar => timed out after undefined ms');
  });

  test('remapError, with statusCode', () => {
    const original = new Error('Some error...') as any;
    original.response = {
      status: 404,
      statusText: 'Not Found',
    };
    const err = remapError(original, createContext('GET', '/foo/bar'));
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBe('EBadHttpResponseStatusCode');
    expect(err.message).toBe('GET /foo/bar => 404');
  });
});

function createContext(method: string, url: string): IHttpContext {
  return {
    method,
    url: new URL(url, 'http://localhost'),
    request: { url },
    headers: {},
    options: {},
    serializers: createDefaultDeserializers(),
  };
}
