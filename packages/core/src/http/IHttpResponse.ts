/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IncomingHttpHeaders } from 'http';

/**
 * The HTTP response returned by the IHttpCLient when sending a IHttpRequest
 */
export interface IHttpResponse {
  /**
   * the status code of the HTTP response
   */
  readonly statusCode?: number;

  /**
   * the display text for the HTTP status code
   */
  readonly statusMessage?: string;

  /**
   * the headers of the HTTP response
   */
  readonly headers?: IncomingHttpHeaders;

  /**
   * the decoded body of the HTTP response.
   * The serializer will decode the body.
   * For instance, A JSON response would return a Javascript object.
   */
  readonly body?: any;
}
