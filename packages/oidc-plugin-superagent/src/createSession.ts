/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ILogger, IHttpDefaults } from '@villedemontreal/auth-core';
import {
  createSession as coreCreateSession,
  injectHttpClient,
  IOidcClientConfig,
  IOidcSession,
  IOidcSessionConfig,
} from '@villedemontreal/auth-oidc';
import { SuperagentHttpClient } from './SuperagentHttpClient';

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
    new SuperagentHttpClient(logger, defaults);
  const mySessionConfig = injectHttpClient(factory, sessionConfig);
  return coreCreateSession(clientConfig, mySessionConfig);
}
