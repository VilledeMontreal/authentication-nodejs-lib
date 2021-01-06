/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import * as superagent from 'superagent';
import { IHttpRequestCorrelator } from '@villedemontreal/auth-core';

/**
 * plugin that will automatically inject a correlation ID generated by the
 * submitted provider into the standard "x-correlation-id" header.
 * Note that your correlation ID provider should rely on CLS (Continuation Local Storage)
 * to make the current correlation ID available to any async hooks created from
 * the incoming HTTP request.
 * @param correlator the correlator used to tag outgoing requests with a Correlation-ID header.
 * @example
 * const correlator =  new HttpRequestCorrelator();
 * const req = superagent
 *   .get('http://localhost:4004/secured/profile')
 *   .use(requestLogger(new ConsoleLogger(() => correlator.getId())))
 *   .use(requestCorrelator(correlator));
 */
export function requestCorrelator(correlator: IHttpRequestCorrelator) {
  return (request: superagent.SuperAgentRequest): superagent.Request => {
    // Note that we have to call bindEmitter in order to maintain the correlation context
    // within the triggered callbacks. Otherwise, the requestLogger plugin won't have access
    // to the current correlation ID when invoking the logger.
    // This propagation is required with both modules (cls-hooked or async_hooks/AsyncLocalStorage).
    correlator.bind(request);
    request.on('request', ({ req }) => {
      if (!req.getHeader('x-correlation-id')) {
        const value = correlator.getId();
        if (value) {
          req.setHeader('x-correlation-id', value);
        }
      }
    });
    return request;
  };
}
