/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpRequest } from './IHttpRequest';
import { IHttpResponse } from './IHttpResponse';

/**
 * Specialized HTTP client that can issue async requests and return a decoded response.
 * Note that it will throw an HttpClientError if the response status codes are not within
 * the 200 to 299 range.
 */
export interface IHttpClient {
  /**
   * Sends a HTTP request to a remote server
   * @param request the HTTP request to send to a remote server
   * @returns a HTTP response from the server
   * @throws HttpClientError when response status code is not within 200 to 299 range,
   *         or for any other exception.
   */
  send(req: Readonly<IHttpRequest>): Promise<IHttpResponse>;
}
