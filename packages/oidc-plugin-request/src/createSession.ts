/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import {
  createSession as coreCreateSession,
  IOidcClientConfig,
  IOidcSession,
  IOidcSessionConfig,
} from '@villedemontreal/auth-oidc';

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
  return coreCreateSession(clientConfig, sessionConfig);
}
