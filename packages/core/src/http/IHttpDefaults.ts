/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { OutgoingHttpHeaders } from 'http';
import { IHttpRequestCorrelator } from './IHttpRequestCorrelator';

/**
 * Defaults values stored by a IHttpClient and used when the submitted request
 * did not provide those values.
 * Note that default headers will be always injected in the outgoing HTTP request,
 * but they would be overridden by the request's headers.
 */
export interface IHttpDefaults {
  /**
   * default headers that will always be injected in the outgoind HTTP request.
   * However, you can override them when sending a request, with custom headers.
   */
  headers?: OutgoingHttpHeaders;

  /**
   * a default timeout
   */
  timeout?: number;

  /**
   * a default number of retries
   */
  retries?: number;

  /**
   * specifies if the http client should log the start and
   * the completion of the requests.
   * @default true.
   */
  logRequests?: boolean;

  /**
   * a correlation service that can return the current correlation ID
   * in order to inject it in the outgoint HTTP request,
   * using the x-correlation-id standard header.
   * @remarks
   * Note that nothing will happen if the request already has such a header.
   */
  correlator?: IHttpRequestCorrelator;
}
