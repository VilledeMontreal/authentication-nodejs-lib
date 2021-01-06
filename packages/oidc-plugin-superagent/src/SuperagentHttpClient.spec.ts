/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import {
  HttpClientError,
  initHttpClientTestSuite,
  NoopLogger,
} from '@villedemontreal/auth-core';
import { remapError, SuperagentHttpClient } from './SuperagentHttpClient';

describe('SuperagentHttpClient', () => {
  initHttpClientTestSuite({
    httpClientFactory: (logger, httpDefaults) =>
      new SuperagentHttpClient(logger, httpDefaults),
  });

  test('the constructor should accept an undefined httpDefaults parameter', () => {
    const client = new SuperagentHttpClient(new NoopLogger());
    expect(client).toBeDefined();
  });

  test('remapError, unexpected error', () => {
    const err = remapError(new Error('Some error...'), 'GET', '/foo/bar');
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBeUndefined();
    expect(err.message).toBe('GET /foo/bar => Some error...');
  });

  test('remapError, with specific message', () => {
    const err = remapError(
      new Error(
        'Uncaught SyntaxError: Unexpected token a in JSON at position 0',
      ),
      'GET',
      '/foo/bar',
    );
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBe('ESerialization');
    expect(err.message).toBe(
      'GET /foo/bar => could not deserialize response body',
    );
  });

  test('remapError, with code', () => {
    const original = new Error('Some error...') as any;
    original.code = 'ECONNABORTED';
    const err = remapError(original, 'GET', '/foo/bar');
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBe('ETIMEDOUT');
    expect(err.message).toBe('GET /foo/bar => timed out after undefined ms');
  });

  test('remapError, with statusCode', () => {
    const original = new Error('Some error...') as any;
    original.response = {
      res: {
        statusCode: 404,
        statusMessage: 'Not Found',
      },
    };
    const err = remapError(original, 'GET', '/foo/bar');
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBe('EBadHttpResponseStatusCode');
    expect(err.message).toBe('GET /foo/bar => 404');
  });

  test('remapError, with response.toJSON', () => {
    const original = new Error('Some error...') as any;
    original.req = {
      url: 'foo/bar',
      method: 'GET',
    };
    original.response = {
      body: 'Body: Not found',
      text: 'Text: Not found',
      res: {
        statusCode: 404,
        statusMessage: 'Not Found',
      },
      toJSON() {
        return {
          statusCode: 404,
          statusMessage: 'Not Found',
          text: 'Not found',
        };
      },
    };
    const err = remapError(original, 'GET', '/foo/bar');
    expect(err).toBeInstanceOf(HttpClientError);
    expect(err.code).toBe('EBadHttpResponseStatusCode');
    expect(err.message).toBe('GET /foo/bar => 404');
    expect(err.innerError).toEqual({
      message: 'Some error...',
    });
    expect(err.response).toEqual({
      statusCode: 404,
      statusMessage: 'Not Found',
    });
    expect(err.body).toBe('Body: Not found');
  });
});
