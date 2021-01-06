/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  Stopwatch,
  ILogger,
  extractMessageFromError,
  TypedProperty,
} from '@villedemontreal/auth-core';
import { makeAxiosPlugin } from './makeAxiosPlugin';
import { getRequestInfo } from './requestUtils';

const watchProperty = new TypedProperty<Stopwatch, AxiosRequestConfig>(
  Symbol('watch'),
);

/**
 * plugin that will log a message before and after the execution of request,
 * and provide additional information such as status code, elapsed time, error...
 * @param logger the logger
 * @example
 * const config: AxiosRequestConfig = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * requestLogger(new ConsoleLogger()).bind(config);
 * const response = await axios.request(config);
 * @example
 * const correlator =  new HttpRequestCorrelator();
 * const config: AxiosRequestConfig = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * requestCorrelator(correlator).bind(config);
 * requestLogger(new ConsoleLogger(() => correlator.getId())).bind(config);
 * const response = await axios.request(config);
 * @example
 * const agent = axios.create();
 * requestLogger(new ConsoleLogger()).bind(agent);
 * const config: AxiosRequestConfig = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * const response = await agent.get('http://localhost:4004/secured/profile');
 * @example
 * const config: AxiosRequestConfig = {};
 * authenticator(session, authenticatorConfig).bind(config);
 * requestLogger(session.logger).bind(config);
 * const response = await axios.get('http://localhost:4004/secured/profile', config);
 */
export function requestLogger(logger: ILogger) {
  return makeAxiosPlugin({
    //--------------------------------------------------------------------
    onStart(config: AxiosRequestConfig): Promise<void> {
      watchProperty.set(config, Stopwatch.startNew());
      const { method, url } = getRequestInfo(config);
      logger.debug({ method, url }, `Start of ${method} ${url}`);
      return Promise.resolve();
    },
    //--------------------------------------------------------------------
    onSuccess(
      config: AxiosRequestConfig,
      response: AxiosResponse,
    ): Promise<void> {
      const { method, url } = getRequestInfo(config);
      const watch = watchProperty.getOrSet(config, Stopwatch.startNew);
      const elapsedTimeInMS = watch.elapsedTimeInMS();
      const { status } = response;
      logger.debug(
        { method, url, elapsedTimeInMS, status },
        `End of ${method} ${url} => ${status} in ${elapsedTimeInMS} ms`,
      );
      return Promise.resolve();
    },
    //--------------------------------------------------------------------
    onError(config: AxiosRequestConfig, error: AxiosError): Promise<void> {
      const { method, url } = getRequestInfo(config);
      const watch = watchProperty.getOrSet(config, Stopwatch.startNew);
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
      return Promise.resolve();
    },
  });
}
