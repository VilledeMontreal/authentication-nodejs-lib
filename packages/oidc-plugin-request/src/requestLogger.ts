/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import {
  Stopwatch,
  ILogger,
  extractMessageFromError,
  TypedProperty,
} from '@villemontreal/auth-core';
import { Request, Response } from 'request';
import { makeRequestPlugin } from './makeRequestPlugin';
import { getRequestInfo } from './requestUtils';

const watchProperty = new TypedProperty<Stopwatch, Request>(Symbol('watch'));

/**
 * plugin that will log a message before and after the execution of request,
 * and provide additional information such as status code, elapsed time, error...
 * @param logger the logger
 * @example
 * const config: request.CoreOptions = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * requestLogger(new ConsoleLogger()).bind(config);
 * const response = await request(config);
 * @example
 * const correlator =  new HttpRequestCorrelator();
 * const config: request.CoreOptions = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * requestCorrelator(correlator).bind(config);
 * requestLogger(new ConsoleLogger(() => correlator.getId())).bind(config);
 * const response = await request(config);
 * @example
 * const defaultConfig: request.CoreOptions = {};
 * requestLogger(new ConsoleLogger()).bind(defaultConfig);
 * const config: request.CoreOptions = {
 *   ...defaultConfig,
 *   baseUrl: 'http://localhost:4004',
 * };
 * const response = await request.get('/secured/profile', config);
 * @example
 * const config: request.CoreOptions = {};
 * authenticator(session, authenticatorConfig).bind(config);
 * requestLogger(session.logger).bind(config);
 * const response = await request.get('http://localhost:4004/secured/profile', config);
 */
export function requestLogger(logger: ILogger) {
  return makeRequestPlugin({
    //--------------------------------------------------------------------
    onStart(req: Request): Promise<void> {
      req.on('request', () => {
        watchProperty.set(req, Stopwatch.startNew());
        const { method, url } = getRequestInfo(req);
        logger.debug({ method, url }, `Start of ${method} ${url}`);
      });
      return Promise.resolve();
    },
    //--------------------------------------------------------------------
    onComplete(req: Request, res: Response): Promise<void> {
      const { method, url } = getRequestInfo(req);
      const watch = watchProperty.getOrSet(req, Stopwatch.startNew);
      const elapsedTimeInMS = watch.elapsedTimeInMS();
      const { statusCode } = res;
      logger.debug(
        { method, url, elapsedTimeInMS, statusCode },
        `End of ${method} ${url} => ${statusCode} in ${elapsedTimeInMS} ms`,
      );
      return Promise.resolve();
    },
    //--------------------------------------------------------------------
    onError(error: Error, req: Request, res?: Response): Promise<void> {
      const { method, url } = getRequestInfo(req);
      const watch = watchProperty.getOrSet(req, Stopwatch.startNew);
      const elapsedTimeInMS = watch.elapsedTimeInMS();
      const errorMessage = extractMessageFromError(error);
      logger.error(
        { method, url, elapsedTimeInMS, error },
        `${method} ${url} failed in ${elapsedTimeInMS} ms: ${errorMessage}`,
      );
      return Promise.resolve();
    },
  });
}
