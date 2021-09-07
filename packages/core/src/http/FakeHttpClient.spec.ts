/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { FakeHttpClient } from './FakeHttpClient';

describe('FakeHttpClient', () => {
  test('no registered mock', () => {
    const httpClient = new FakeHttpClient();
    return expect(
      httpClient.send({ url: 'http://localhost/some/path' }),
    ).rejects.toThrowError(
      'No registered mock for http call: GET http://localhost/some/path',
    );
  });

  test('no matching mock', () => {
    // setup
    const httpClient = new FakeHttpClient();
    const fakeBody = { age: 33, foo: 'bar' };
    httpClient.register({
      accepts: req => req.url.indexOf('/some/path') > 0,
      returns: req => ({ body: fakeBody, statusCode: 200 }),
    });
    // act
    return expect(
      httpClient.send({ url: 'http://localhost/other/path' }),
    ).rejects.toThrowError(
      'No registered mock for http call: GET http://localhost/other/path',
    );
  });

  test('send success', async () => {
    // setup
    const httpClient = new FakeHttpClient();
    const fakeBody = { age: 33, foo: 'bar' };
    httpClient.register({
      accepts: req => req.url.indexOf('/some/path') > 0,
      returns: req => ({ body: fakeBody, statusCode: 200 }),
    });
    // act
    const result = await httpClient.send({ url: 'http://localhost/some/path' });
    // expect
    expect(result).toBeDefined();
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual(fakeBody);
    expect(httpClient.lastCall()).toEqual({
      req: {
        url: 'http://localhost/some/path',
      },
      res: {
        body: {
          age: 33,
          foo: 'bar',
        },
        statusCode: 200,
      },
    });
  });

  test('send error 404', async () => {
    // setup
    const httpClient = new FakeHttpClient();
    httpClient.register({
      accepts: req => req.url.indexOf('/some/path') > 0,
      returns: req => ({ statusCode: 404 }),
    });
    try {
      // act
      await httpClient.send({ url: 'http://localhost/some/path' });
      throw new Error('expected to receive a 404 error');
    } catch (e: any) {
      // expect
      expect(e.statusCode).toBe(404);
    }
  });
});
