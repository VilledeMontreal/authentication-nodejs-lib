/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { ILogger, IHttpDefaults } from '@villemontreal/auth-core';
import {
  createSession as coreCreateSession,
  injectHttpClient,
  IOidcClientConfig,
  IOidcSession,
  IOidcSessionConfig,
} from '@villemontreal/auth-oidc';
import { AxiosHttpClient } from './AxiosHttpClient';

/**
 * creates a new OIDC session using a IHttpClient implemented by Superagent
 * @param clientConfig the config for the OIDC client
 * @param [sessionConfig] the config for the OIDC session
 * @returns IOidcSession
 */
export function createSession(
  clientConfig: IOidcClientConfig,
  sessionConfig?: IOidcSessionConfig,
): IOidcSession {
  const factory = (logger: ILogger, defaults: IHttpDefaults) =>
    new AxiosHttpClient(logger, defaults);
  const mySessionConfig = injectHttpClient(factory, sessionConfig);
  return coreCreateSession(clientConfig, mySessionConfig);
}
