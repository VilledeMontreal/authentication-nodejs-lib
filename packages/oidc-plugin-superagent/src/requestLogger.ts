/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import * as superagent from 'superagent';
import {
  Stopwatch,
  ILogger,
  extractMessageFromError,
} from '@villemontreal/auth-core';

/**
 * plugin that will log a message before and after the execution of request,
 * and provide additional information such as status code, elapsed time, error...
 * @param logger the logger
 * @example
 * const req = superagent
 *   .get('http://localhost:4004/secured/profile')
 *   .use(requestLogger(new ConsoleLogger()));
 * @example
 * const correlator =  new HttpRequestCorrelator();
 * const req = superagent
 *   .get('http://localhost:4004/secured/profile')
 *   .use(requestLogger(new ConsoleLogger(() => correlator.getId())))
 *   .use(requestCorrelator(correlator));
 * @example
 * const agent = superagent
 *   .agent()
 *   .use(requestLogger(new ConsoleLogger()));
 * const req = agent.get('http://localhost:4004/secured/profile');
 * @example
 * const req = superagent
 *   .get('http://localhost:4004/secured/profile')
 *   .use(requestLogger(session.logger))
 *   .use(authenticator(session, authenticatorConfig));
 */
export function requestLogger(logger: ILogger) {
  return (request: superagent.SuperAgentRequest): superagent.Request => {
    const watch = Stopwatch.startNew();
    let responseLogged = false;
    // Note that we don't listen to the native http events
    // because we loose the correlation context that is maintained
    // only with the Superagent request EventEmitter.
    request.on('request', ({ req }) => {
      // we restart the watch just in case the request would be retried.
      watch.restart();
      const { url, method } = request;
      logger.debug({ method, url }, `Start of ${method} ${url}`);
    });
    request.on('response', (res: any) => {
      const { url, method } = request;
      const elapsedTimeInMS = watch.elapsedTimeInMS();
      const { statusCode } = res;
      logger.debug(
        { method, url, elapsedTimeInMS, statusCode },
        `End of ${method} ${url} => ${statusCode} in ${elapsedTimeInMS} ms`,
      );
      responseLogged = true;
    });

    request.on('error', (error: any) => {
      if (!responseLogged) {
        const { url, method } = request;
        const elapsedTimeInMS = watch.elapsedTimeInMS();
        const errorMessage = extractMessageFromError(error);
        // note that we clone and trim the error object to avoid
        // displaying too much information in the logs.
        const clonedError = { ...error, message: error.message };
        delete clonedError.response;
        logger.error(
          { method, url, elapsedTimeInMS, error: clonedError },
          `${method} ${url} failed in ${elapsedTimeInMS} ms: ${errorMessage}`,
        );
      }
    });

    return request;
  };
}
