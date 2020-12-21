/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { OutgoingHttpHeaders } from 'http';

/**
 * HTTP request that can be sent by a IHttpClient
 */
export interface IHttpRequest {
  /**
   * the target url
   */
  url: string;

  /**
   * the HTTP method
   */
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD' | 'OPTIONS';

  /**
   * the HTTP headers
   */
  headers?: OutgoingHttpHeaders;

  /**
   * the body of the HTTP request
   * @remarks
   * The object will be serialized either as text or as buffer,
   * depending on the specified content-type.
   * If no content-type is specified, it will be guessed from the body object type:
   * - {String} => text/plain
   * - {Buffer} => application/octet-stream
   * - {URLSearchParams} => application/x-www-form-urlencoded
   * - anything else => application/json
   */
  body?: any;

  /**
   * the timeout before giving up
   */
  timeout?: number;

  /**
   * The maximum number of retries
   */
  retries?: number;
}
