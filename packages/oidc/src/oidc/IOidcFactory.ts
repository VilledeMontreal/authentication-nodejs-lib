/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpClient, ILogger, ITimeProvider } from '@villemontreal/auth-core';
import { IHttpDefaults } from '@villemontreal/auth-core/dist/http/IHttpDefaults';
// eslint-disable-next-line import/no-cycle
import { IOidcSession } from './IOidcSession';
import { IClaimsProvider } from '../tokens/IClaimsProvider';
import { ITokenProvider } from '../tokens/ITokenProvider';
import { ITokenStore } from '../tokens/ITokenStore';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcServerConfigGetter } from './IOidcServerConfigGetter';
import { IOidcServerConfigProvider } from './IOidcServerConfigProvider';
// eslint-disable-next-line import/no-cycle
import { IOidcSessionConfig } from './IOidcSessionConfig';

/**
 * The factory that can build the objects required to make a new OIDC session.
 * This factory can be customized from the IOidcSessionConfig,
 * when building a new OIDC session.
 */
export interface IOidcFactory {
  // -----------------------------------------------------
  /** the constructor for a new IClaimsProvider */
  createClaimsProvider: (
    logger: ILogger,
    httpClient: IHttpClient,
    clientConfig: IOidcClientConfig,
    serverConfigGetter: IOidcServerConfigGetter,
  ) => IClaimsProvider;
  // -----------------------------------------------------
  /** the constructor for a new IHttpClient */
  createHttpClient: (logger: ILogger, defaults: IHttpDefaults) => IHttpClient;
  // -----------------------------------------------------
  /** the constructor for a new ILogger */
  createLogger: () => ILogger;
  // -----------------------------------------------------
  /** the constructor for a new IOidcServerConfigProvider */
  createServerConfigProvider: (
    logger: ILogger,
    httpClient: IHttpClient,
    timeProvider: ITimeProvider,
    requestTimeout?: number,
  ) => IOidcServerConfigProvider;
  // -----------------------------------------------------
  /** the constructor for a new IOidcSession */
  createSession: (
    logger: ILogger,
    httpClient: IHttpClient,
    tokenStore: ITokenStore,
    tokenProvider: ITokenProvider,
    serverConfigGetter: IOidcServerConfigGetter,
    clientConfig: IOidcClientConfig,
    sessionConfig: IOidcSessionConfig,
  ) => IOidcSession;
  // -----------------------------------------------------
  /** the constructor for a new ITimeProvider */
  createTimeProvider: () => ITimeProvider;
  // -----------------------------------------------------
  /** the constructor for a new ITokenProvider */
  createTokenProvider: (
    logger: ILogger,
    httpClient: IHttpClient,
    serverConfigGetter: IOidcServerConfigGetter,
    clientConfig: IOidcClientConfig,
    timeProvider: ITimeProvider,
    claimsProvider?: IClaimsProvider,
  ) => ITokenProvider;
  // -----------------------------------------------------
  /** the constructor for a new ITokenStore */
  createTokenStore: (logger: ILogger) => ITokenStore;
  // -----------------------------------------------------
}
