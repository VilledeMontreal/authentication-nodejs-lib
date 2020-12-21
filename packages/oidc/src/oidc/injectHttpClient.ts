/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpClient, ILogger } from '@villemontreal/auth-core';
import { IHttpDefaults } from '@villemontreal/auth-core/dist/http/IHttpDefaults';
import { IOidcFactory } from './IOidcFactory';
import { IOidcSessionConfig } from './IOidcSessionConfig';

/**
 * If the submitted sessionConfig does not already override the createHttpClient factory,
 * then it will override it using the provided httpClientFactory.
 * This function is used by the http client library bindings, in order to replace
 * the DefaultHttpClient with a custom IHttpClient using the one offered by the library
 * beeing bound.
 * @param httpClientFactory the factory handler for building a new IHttpClient
 * @param [sessionConfig] the config for building a new OIDC session
 */
export function injectHttpClient(
  httpClientFactory: (logger: ILogger, defaults: IHttpDefaults) => IHttpClient,
  sessionConfig?: IOidcSessionConfig,
): IOidcSessionConfig {
  // Note that since the configs should remain readonly, we have to recreate them in order
  // to inject our http client.

  if (
    sessionConfig &&
    sessionConfig.factory &&
    sessionConfig.factory.createHttpClient
  ) {
    // do not change httpClient if already provided.
    return sessionConfig;
  }
  if (sessionConfig && sessionConfig.factory) {
    const factory: Partial<IOidcFactory> = {
      ...sessionConfig.factory,
      createHttpClient: httpClientFactory,
    };
    return { ...sessionConfig, factory };
  }
  if (sessionConfig) {
    return {
      ...sessionConfig,
      factory: {
        createHttpClient: httpClientFactory,
      },
    };
  }
  return {
    factory: {
      createHttpClient: httpClientFactory,
    },
  };
}
