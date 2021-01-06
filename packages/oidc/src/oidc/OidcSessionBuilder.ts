/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  DefaultHttpClient,
  IHttpClient,
  ILogger,
  ITimeProvider,
  NoopLogger,
  SystemTimeProvider,
} from '@villedemontreal/auth-core';
import { IHttpDefaults } from '@villedemontreal/auth-core/dist/http/IHttpDefaults';
import { IClaimsProvider } from '../tokens/IClaimsProvider';
import { InMemoryTokenStore } from '../tokens/InMemoryTokenStore';
import { ITokenProvider } from '../tokens/ITokenProvider';
import { ITokenStore } from '../tokens/ITokenStore';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcFactory } from './IOidcFactory';
import { IOidcServerConfigGetter } from './IOidcServerConfigGetter';
import { IOidcSession } from './IOidcSession';
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcServerConfigGetter } from './OidcServerConfigGetter';
import { OidcSession } from './OidcSession';
// eslint-disable-next-line import/no-cycle
import { OidcTokenProvider } from './OidcTokenProvider';
import { OidcUserInfoClaimsProvider } from './OidcUserInfoClaimsProvider';
import { OidcWellknownServerConfigProvider } from './OidcWellknownServerConfigProvider';

/**
 * Builder that can build new IOidcSession objects
 */
export class OidcSessionBuilder {
  /**
   * builds a new OIDC session
   * @param clientConfig the OIDC client config
   * @param [sessionConfig] the session config
   * @returns IOidcSession
   */
  public buildSession(
    clientConfig: IOidcClientConfig,
    sessionConfig?: IOidcSessionConfig,
  ): IOidcSession {
    if (!clientConfig) {
      throw new Error('clientConfig is required');
    }
    const localSessionConfig = sessionConfig || {};
    const factory = this.createFactory(
      sessionConfig ? sessionConfig.factory : undefined,
    );
    const logger = factory.createLogger();
    const timeProvider = factory.createTimeProvider();
    const tokenStore = factory.createTokenStore(logger);
    const httpClient = factory.createHttpClient(
      logger,
      sessionConfig?.httpDefaults || {},
    );
    const serverConfigProvider = factory.createServerConfigProvider(
      logger,
      httpClient,
      timeProvider,
      clientConfig.requestTimeout,
    );
    const serverConfigGetter = new OidcServerConfigGetter(
      serverConfigProvider,
      clientConfig,
    );
    const claimsProvider = factory.createClaimsProvider(
      logger,
      httpClient,
      clientConfig,
      serverConfigGetter,
    );
    const tokenProvider = factory.createTokenProvider(
      logger,
      httpClient,
      serverConfigGetter,
      clientConfig,
      timeProvider,
      claimsProvider,
    );
    return factory.createSession(
      logger,
      httpClient,
      tokenStore,
      tokenProvider,
      serverConfigGetter,
      clientConfig,
      localSessionConfig,
    );
  }

  /**
   * returns a default IOidcFactory
   */
  public createDefaultFactory(): IOidcFactory {
    return {
      // -----------------------------------------------------
      createClaimsProvider: (
        logger: ILogger,
        httpClient: IHttpClient,
        clientConfig: IOidcClientConfig,
        serverConfigGetter: IOidcServerConfigGetter,
      ) =>
        new OidcUserInfoClaimsProvider(
          logger,
          httpClient,
          clientConfig,
          serverConfigGetter,
        ),
      // -----------------------------------------------------
      createHttpClient: (logger: ILogger, defaults: IHttpDefaults) =>
        new DefaultHttpClient(logger, defaults),
      // -----------------------------------------------------
      createLogger: () => new NoopLogger(),
      // -----------------------------------------------------
      createServerConfigProvider: (
        logger: ILogger,
        httpClient: IHttpClient,
        timeProvider: ITimeProvider,
        requestTimeout?: number,
      ) =>
        new OidcWellknownServerConfigProvider(
          logger,
          httpClient,
          timeProvider,
          requestTimeout,
        ),
      // -----------------------------------------------------
      createSession: (
        logger: ILogger,
        httpClient: IHttpClient,
        tokenStore: ITokenStore,
        tokenProvider: ITokenProvider,
        serverConfigGetter: IOidcServerConfigGetter,
        clientConfig: IOidcClientConfig,
        sessionConfig: IOidcSessionConfig,
      ) =>
        new OidcSession(
          logger,
          httpClient,
          tokenStore,
          tokenProvider,
          serverConfigGetter,
          clientConfig,
          sessionConfig,
        ),
      // -----------------------------------------------------
      createTimeProvider: () => new SystemTimeProvider(),
      // -----------------------------------------------------
      createTokenProvider: (
        logger: ILogger,
        httpClient: IHttpClient,
        serverConfigGetter: IOidcServerConfigGetter,
        clientConfig: IOidcClientConfig,
        timeProvider: ITimeProvider,
        claimsProvider?: IClaimsProvider,
      ) =>
        new OidcTokenProvider(
          logger,
          httpClient,
          serverConfigGetter,
          clientConfig,
          timeProvider,
          claimsProvider,
        ),
      // -----------------------------------------------------
      createTokenStore: (logger: ILogger) => new InMemoryTokenStore(logger),
      // -----------------------------------------------------
    };
  }

  /**
   * creates a custom IOidcFactory that overrides the factory created by
   * createDefaultFactory with the submitted custom factory
   * @param [configFactory] a custom factory
   */
  public createFactory(configFactory?: Partial<IOidcFactory>): IOidcFactory {
    const defaultFactory = this.createDefaultFactory();
    if (configFactory) {
      return {
        ...defaultFactory,
        ...configFactory,
      };
    }
    return defaultFactory;
  }
}
