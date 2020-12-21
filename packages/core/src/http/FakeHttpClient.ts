/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { HttpClientError } from './HttpClientError';
import { IHttpClient } from './IHttpClient';
import { IHttpRequest } from './IHttpRequest';
import { IHttpResponse } from './IHttpResponse';

export interface IHttpMock {
  accepts: (req: Readonly<IHttpRequest>) => boolean;
  returns: (req: IHttpRequest) => IHttpResponse;
}

export interface IHttpCall {
  req: Readonly<IHttpRequest>;
  res?: IHttpResponse;
  err?: any;
}

/**
 * Fake implementation of a IHttpClient used to record and mock requests during unit tests.
 */
export class FakeHttpClient implements IHttpClient {
  public calls: IHttpCall[] = [];

  private readonly mocks: IHttpMock[] = [];

  /**
   * get the last issued request
   */
  public lastCall() {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Registers a mock that can intercept specific request and return a hardcoded response
   * @param mock the request interceptor
   */
  public register(mock: IHttpMock) {
    this.mocks.push(mock);
  }

  /**
   * Sends a HTTP request to a remote server
   * @param req the HTTP request to send to a remote server
   * @returns a HTTP response from the server
   * @throws HttpClientError when response status code is not within 200 to 299 range,
   *         or for any other exception.
   */
  public async send(req: Readonly<IHttpRequest>): Promise<IHttpResponse> {
    const method = req.method || 'GET';
    for (const mock of this.mocks) {
      if (mock.accepts(req)) {
        const res = mock.returns(req);
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          this.calls.push({ req, res });
          return Promise.resolve(res);
        }
        const err = new HttpClientError(
          `[ERROR] ${method} ${req.url} => ${res.statusCode}`,
          'EBadHttpResponseStatusCode',
          res.statusCode,
          res.statusMessage,
          res.body,
          undefined,
          undefined,
        );
        this.calls.push({ req, err });
        return Promise.reject(err);
      }
    }
    throw new Error(`No registered mock for http call: ${method} ${req.url}`);
  }
}
