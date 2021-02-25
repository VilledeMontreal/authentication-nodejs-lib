/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/* eslint-disable import/no-extraneous-dependencies */

import {
  Options,
  OptionsJson,
  OptionsText,
  OptionsUrlencoded,
} from 'body-parser';
import express from 'express';
import { Server } from 'http';
import { NextHandleFunction } from 'connect';
import { ILogger } from '..';
import { FakeLogger } from '../logging/FakeLogger';
import { HttpClientError } from './HttpClientError';
import { IHttpClient } from './IHttpClient';
import { IHttpRequest } from './IHttpRequest';
import { IHttpDefaults } from './IHttpDefaults';
import { FakeHttpRequestCorrelator } from './FakeHttpRequestCorrelator';

export interface IHttpClientTestSuiteOptions {
  httpClientFactory: (
    logger: ILogger,
    httpDefaults: IHttpDefaults,
  ) => IHttpClient;
  express: any;
  bodyParser: any;
}
export function initHttpClientTestSuite(options: IHttpClientTestSuiteOptions) {
  let server: Server;
  let client: IHttpClient;
  let logger: FakeLogger;
  let requestCounter = 0;

  beforeAll(async () => {
    server = await createSampleApi();
  });

  afterAll(async () => {
    if (server) {
      await closeServer(server);
    }
  });

  beforeEach(() => {
    requestCounter = 0;
    logger = new FakeLogger();
    client = options.httpClientFactory(logger, {});
  });

  test('unknown hostname', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'https://fcce1498-4019-401b-bb06-3cbe784edd23.com/foo/bar',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('ENOTFOUND');
      expect(err.statusCode).toBeUndefined();
      expect(err.statusMessage).toBeUndefined();
      expect(err.message).toContain(
        'GET https://fcce1498-4019-401b-bb06-3cbe784edd23.com/foo/bar => getaddrinfo ENOTFOUND fcce1498-4019-401b-bb06-3cbe784edd23.com',
      );
      expect(err.innerError).toBeDefined();
      if (err.innerError) {
        expect(err.innerError.message).toContain(
          'getaddrinfo ENOTFOUND fcce1498-4019-401b-bb06-3cbe784edd23.com',
        );
      }
    }
  });

  test('unknown resource', async () => {
    // setup
    const req: IHttpRequest = {
      // url: 'https://jsonplaceholder.typicode.com/todox',
      url: 'http://localhost:3000/todox',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('EBadHttpResponseStatusCode');
      expect(err.statusCode).toBe(404);
      expect(err.statusMessage).toBe('Not Found');
      expect(err.message).toBe('GET http://localhost:3000/todox => 404');
    }
  });

  test('unknown request content type, except for string/buffer body, should fail', async () => {
    // setup
    const req: IHttpRequest = {
      body: 123,
      headers: {
        'content-type': 'application/x-yaml',
      },
      method: 'POST',
      url: 'http://localhost:3000/yaml',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('ESerialization');
      expect(err.message).toBe(
        'POST http://localhost:3000/yaml => Could not serialize body',
      );
      expect(err.innerError).toBeDefined();
      if (err.innerError) {
        expect(err.innerError.message).toBe(
          // tslint:disable-next-line: quotemark
          "Could not find a serializer for contentType 'application/x-yaml'",
        );
      }
    }
  });

  test('unknown request content type, for string/buffer body, should work', async () => {
    // setup
    const req: IHttpRequest = {
      body: Buffer.from('foo: bar'),
      headers: {
        'content-type': 'application/x-yaml',
      },
      method: 'POST',
      url: 'http://localhost:3000/yaml',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toBe(201);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.toString()).toEqual('foo: bar');
  });

  test('unknown response content type', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/yaml',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.toString()).toEqual('foo: bar');
  });

  test('json deserialization error', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/bad-json',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('ESerialization');
      expect(err.message).toBe(
        'GET http://localhost:3000/bad-json => could not deserialize response body',
      );
      expect(err.innerError).toBeDefined();
      if (err.innerError) {
        expect(err.innerError.message).toBe(
          'Unexpected token a in JSON at position 0',
        );
      }
      expect(requestCounter).toBe(1);
    }
  });

  test('get json', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual({
      completed: false,
      id: 1,
      title: 'delectus aut autem',
      userId: 1,
    });
    expect(requestCounter).toBe(1);
    expect(
      logger.entries.find(
        x =>
          x.txtMsg &&
          x.txtMsg.indexOf('Start of GET http://localhost:3000/json') >= 0,
      ),
    ).toBeDefined();
    expect(
      logger.entries.find(
        x =>
          x.txtMsg &&
          x.txtMsg.indexOf('End of GET http://localhost:3000/json') >= 0,
      ),
    ).toBeDefined();
  });

  test('get json with one retry', async () => {
    // setup
    const req: IHttpRequest = {
      retries: 1,
      url: 'http://localhost:3000/retry-json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual({
      completed: false,
      id: 1,
      title: 'delectus aut autem',
      userId: 1,
    });
    expect(requestCounter).toBe(2);
  });

  test('post json', async () => {
    // setup
    const req: IHttpRequest = {
      body: {
        age: 33,
        foo: 'bar',
      },
      method: 'POST',
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(req.body);
    expect(requestCounter).toBe(1);
  });

  test('post json as buffer', async () => {
    // setup
    const jsonObj = {
      age: 33,
      foo: 'bar',
    };
    const req: IHttpRequest = {
      body: Buffer.from(JSON.stringify(jsonObj)),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(jsonObj);
  });

  test('post json as text', async () => {
    // setup
    const jsonObj = {
      age: 33,
      foo: 'bar',
    };
    const req: IHttpRequest = {
      body: JSON.stringify(jsonObj),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(jsonObj);
  });

  test('get form', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/form',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      q: 'foobar',
      topic: 'api',
    });
  });

  test('post form', async () => {
    // setup
    const req: IHttpRequest = {
      body: {
        age: '33',
        empty: null,
        foo: 'bar',
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      url: 'http://localhost:3000/form',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual({
      age: '33',
      empty: '',
      foo: 'bar',
    });
  });

  test('post form as URLSearchParams', async () => {
    // setup
    // note that the content-type will be guessed from the URLSearchParams object type
    const form = new URLSearchParams();
    form.set('age', '33');
    form.set('foo', 'bar');
    form.set('empty', '');
    const req: IHttpRequest = {
      body: form,
      method: 'POST',
      url: 'http://localhost:3000/form',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual({
      age: '33',
      empty: '',
      foo: 'bar',
    });
  });

  test('get text', async () => {
    // setup
    const req: IHttpRequest = {
      headers: {
        accept: 'text/plain',
      },
      url: 'http://localhost:3000/text',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual('Hello World');
  });

  test('receive empty text', async () => {
    // setup
    const req: IHttpRequest = {
      body: '',
      headers: {
        'content-type': 'text/plain',
      },
      method: 'POST',
      url: 'http://localhost:3000/text',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toBeNull();
  });

  test('post text', async () => {
    // setup
    const req: IHttpRequest = {
      body: 'Hello',
      method: 'POST',
      url: 'http://localhost:3000/text',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(req.body);
  });

  test('disconnected request', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/disconnected-request',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (err) {
      // expect
      expect(err).toBeInstanceOf(HttpClientError);
      expect(err.message).toBe(
        'GET http://localhost:3000/disconnected-request => socket hang up',
      );
      expect(err.code).toBe('ECONNRESET');
      expect(requestCounter).toBe(1);
    }
  });

  test('retry disconnected request', async () => {
    // setup
    const req: IHttpRequest = {
      retries: 1,
      url: 'http://localhost:3000/disconnected-request',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual('Hello World');
    expect(requestCounter).toBe(2);
  });

  test('post html', async () => {
    // setup
    const req: IHttpRequest = {
      body: 'Foo: bar',
      headers: {
        'content-type': 'text/html',
      },
      method: 'POST',
      url: 'http://localhost:3000/html',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual(req.body);
  });

  test('post binary, with content-type', async () => {
    // setup
    const req: IHttpRequest = {
      body: createBuffer(),
      headers: {
        'content-type': 'image/jpeg',
      },
      method: 'POST',
      url: 'http://localhost:3000/binary',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body).toEqual(req.body);
  });

  test('post binary, without content-type', async () => {
    // setup
    const req: IHttpRequest = {
      body: createBuffer(),
      method: 'POST',
      url: 'http://localhost:3000/binary',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body).toEqual(req.body);
  });

  test('post binary, with body that is not a buffer, should fail', async () => {
    // setup
    const req: IHttpRequest = {
      body: 123,
      headers: {
        'content-type': 'image/jpeg',
      },
      method: 'POST',
      url: 'http://localhost:3000/binary',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (err) {
      expect(err.message).toBe(
        'POST http://localhost:3000/binary => Could not serialize body',
      );
      expect(err.innerError.message).toBe(
        'A binary serializer can only receive a buffer',
      );
    }
  });

  test('post unrecognized content-type', async () => {
    // setup
    const req: IHttpRequest = {
      body: 'Foo: bar',
      headers: {
        'content-type': 33,
      },
      method: 'POST',
      url: 'http://localhost:3000/html',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual(req.body);
  });

  test('bad request', async () => {
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/bad-request',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('EBadHttpResponseStatusCode');
      expect(err.message).toBe('GET http://localhost:3000/bad-request => 400');
      expect(err.body).toBe('Some validation error...');
      expect(requestCounter).toBe(1);
    }
  });

  test('test timeout does not expire', async () => {
    // setup
    const req: IHttpRequest = {
      timeout: 100,
      url: 'http://localhost:3000/slow',
    };
    // act
    const res = await client.send(req);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual('OK');
  });

  test('test timeout expires', async () => {
    // setup
    const req: IHttpRequest = {
      timeout: 10,
      url: 'http://localhost:3000/slow',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('ETIMEDOUT');
      expect(err.message).toBe(
        'GET http://localhost:3000/slow => timed out after 10 ms',
      );
    }
  });

  test('get request with cookies', async () => {
    // setup
    const req: IHttpRequest = {
      headers: {
        accept: 'text/plain',
        cookie: ['foo=bar', 'session_id=1234'],
      },
      url: 'http://localhost:3000/text',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual('Hello World');
    if (res.headers) {
      expect(res.headers['set-cookie']).toEqual([
        'foo=bar; Path=/',
        'session_id=1234; Path=/',
      ]);
    } else {
      throw new Error('expected to receive cookies');
    }
  });

  test('send request without logging', async () => {
    client = options.httpClientFactory(logger, { logRequests: false });
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual({
      completed: false,
      id: 1,
      title: 'delectus aut autem',
      userId: 1,
    });
    expect(requestCounter).toBe(1);
    expect(
      logger.entries.find(
        x =>
          x.txtMsg &&
          x.txtMsg.indexOf('Start of GET http://localhost:3000/json') >= 0,
      ),
    ).toBeUndefined();
    expect(
      logger.entries.find(
        x =>
          x.txtMsg &&
          x.txtMsg.indexOf('End of GET http://localhost:3000/json') >= 0,
      ),
    ).toBeUndefined();
  });

  test('bad request without logging', async () => {
    client = options.httpClientFactory(logger, { logRequests: false });
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/bad-request',
    };
    try {
      // act
      await client.send(req);
      throw new Error('expected error');
    } catch (e) {
      // expect
      expect(e).toBeInstanceOf(HttpClientError);
      const err = e as HttpClientError;
      expect(err.code).toBe('EBadHttpResponseStatusCode');
      expect(err.message).toBe('GET http://localhost:3000/bad-request => 400');
      expect(err.body).toBe('Some validation error...');
      expect(requestCounter).toBe(1);
      expect(
        logger.entries.find(
          x =>
            x.txtMsg &&
            x.txtMsg.indexOf(
              'Start of GET http://localhost:3000/bad-request',
            ) >= 0,
        ),
      ).toBeUndefined();
      expect(
        logger.entries.find(
          x =>
            x.txtMsg &&
            x.txtMsg.indexOf(
              'Attempt #1 of GET http://localhost:3000/bad-request failed',
            ) >= 0,
        ),
      ).toBeUndefined();
    }
  });

  test('get json with a correlation ID', async () => {
    client = options.httpClientFactory(logger, {
      logRequests: false,
      correlator: new FakeHttpRequestCorrelator('my-correlation-id'),
    });
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual({
      completed: false,
      id: 1,
      title: 'delectus aut autem',
      userId: 1,
      correlationId: 'my-correlation-id',
    });
    expect(requestCounter).toBe(1);
  });

  test('get json with empty correlation ID should not define a header', async () => {
    client = options.httpClientFactory(logger, {
      logRequests: false,
      correlator: new FakeHttpRequestCorrelator(),
    });
    // setup
    const req: IHttpRequest = {
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual({
      completed: false,
      id: 1,
      title: 'delectus aut autem',
      userId: 1,
    });
    expect(requestCounter).toBe(1);
  });

  test('get json with existing correlation ID should not override value', async () => {
    client = options.httpClientFactory(logger, {
      logRequests: false,
      correlator: new FakeHttpRequestCorrelator('my-correlation-id'),
    });
    // setup
    const req: IHttpRequest = {
      headers: {
        'x-correlation-id': 'existing-correlation-id',
      },
      url: 'http://localhost:3000/json',
    };
    // act
    const res = await client.send(req);
    // expect
    expect(res.body).toEqual({
      completed: false,
      id: 1,
      title: 'delectus aut autem',
      userId: 1,
      correlationId: 'existing-correlation-id',
    });
    expect(requestCounter).toBe(1);
  });

  function createBuffer() {
    return Buffer.from([1, 2, 3]);
  }

  function createSampleApi(): Promise<Server> {
    const app: express.Application = options.express();
    const typedBodyParser: {
      json: (options?: OptionsJson) => NextHandleFunction;
      raw: (options?: Options) => NextHandleFunction;
      text: (options?: OptionsText) => NextHandleFunction;
      urlencoded: (options?: OptionsUrlencoded) => NextHandleFunction;
    } = options.bodyParser;
    app.use(typedBodyParser.json());
    app.use(
      typedBodyParser.text({
        type: ['text/plain', 'text/html', 'application/x-yaml'],
      }),
    );
    app.use(typedBodyParser.urlencoded({ extended: true }));
    app.use(
      typedBodyParser.raw({ type: ['image/jpeg', 'application/octet-stream'] }),
    );
    app.use((req, res, next) => {
      requestCounter += 1;
      next();
    });

    app.get('/text', (req, res) => {
      if (req.headers.cookie) {
        for (const c of req.headers.cookie.split(';')) {
          const items = c.split('=');
          res.cookie(items[0], items[1]);
        }
      }
      res.send('Hello World');
    });
    app.post('/text', (req, res) => {
      res.contentType('text/plain').status(201).send(req.body);
    });
    app.get('/json', (req, res) => {
      res.json({
        completed: false,
        id: 1,
        title: 'delectus aut autem',
        userId: 1,
        correlationId: req.headers['x-correlation-id'],
      });
    });
    app.post('/json', (req, res) => {
      res.status(201).json(req.body);
    });
    app.get('/retry-json', (req, res) => {
      if (requestCounter === 1) {
        res.sendStatus(500);
      } else {
        res.json({
          completed: false,
          id: 1,
          title: 'delectus aut autem',
          userId: 1,
        });
      }
    });
    app.get('/bad-json', (req, res) => {
      res.type('json').send('a: 1, b:2');
    });
    app.get('/form', (req, res) => {
      res.type('application/x-www-form-urlencoded').send('q=foobar&topic=api');
    });
    app.post('/form', (req, res) => {
      res.setHeader('Location', '/form/123');
      res.status(201).json(req.body);
    });
    app.get('/yaml', (req, res) => {
      res.contentType('application/x-yaml').send('foo: bar');
    });
    app.post('/yaml', (req, res) => {
      res.status(201).contentType('application/x-yaml').send(req.body);
    });
    app.post('/html', (req, res) => {
      res.contentType('text/html').status(201).send(req.body);
    });
    app.get('/binary', (req, res) => {
      res.contentType('image/jpeg').send(req.body);
    });
    app.post('/binary', (req, res) => {
      res.contentType('image/jpeg').send(req.body);
    });
    app.get('/bad-request', (req, res) => {
      res.status(400).send('Some validation error...');
    });
    app.get('/disconnected-request', (req, res) => {
      if (requestCounter === 1) {
        (res as any).connection.destroy();
      } else {
        res.send('Hello World');
      }
    });
    app.get('/slow', (req, res) => {
      setTimeout(() => {
        res.send('OK');
      }, 50);
    });
    return new Promise((resolve, reject) => {
      const newServer = app.listen(3000, (...args: any[]) => {
        const [err] = args;
        if (err) {
          reject(err);
        } else {
          resolve(newServer);
        }
      });
    });
  }

  function closeServer(theServer: Server): Promise<void> {
    return new Promise((resolve, reject) => {
      theServer.close(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
