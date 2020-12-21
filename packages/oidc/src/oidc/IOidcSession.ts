/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpClient, ILogger } from '@villemontreal/auth-core';
import { TokenSet } from '../tokens/TokenSet';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcServerConfig } from './IOidcServerConfig';
// eslint-disable-next-line import/no-cycle
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcSessionState } from './OidcSessionState';

/**
 * The OIDC session that can provide an access token required to authenticate
 * API calls.
 * You can also subscribe to events triggered by the session when its state changes
 * or when a new token has been acquired.
 */
export interface IOidcSession {
  /** the logger */
  readonly logger: ILogger;
  /** the HTTP client */
  readonly httpClient: IHttpClient;
  /** the client config used to authenticate */
  readonly clientConfig: Readonly<IOidcClientConfig>;
  /** the config used to customize the session */
  readonly sessionConfig: Readonly<IOidcSessionConfig>;

  /**
   * gets the OIDC server config used to discover the token endpoint
   */
  getServerConfig(): Promise<Readonly<IOidcServerConfig>>;

  /**
   * gets the current state of the session
   */
  getState(): Promise<OidcSessionState>;

  /**
   * forces a refresh of the current token.
   */
  forceRefreshToken(): Promise<TokenSet>;

  /**
   * gets the current token.
   * if there is no token or if the token has expired, it will acquire a new one.
   */
  getToken(): Promise<TokenSet>;

  /**
   * tells if there is already a current token (which might be expired)
   */
  hasToken(): Promise<boolean>;

  /**
   * deletes the submitted token from the token store.
   * Note that nothing will happen if the token does not exist.
   * @param token the token to delete
   */
  deleteToken(token: TokenSet): Promise<void>;

  /**
   * triggered every time a new token has been acquired
   * @param event the 'token' event
   * @param listener the handler that will receive the new token
   */
  on(event: 'token', listener: (token: TokenSet) => void): this;

  /**
   * triggered everytime the state of the session changes
   * @param event the 'stateChanged' event
   * @param listener the handler that will receive the new state
   */
  on(event: 'stateChanged', listener: (state: OidcSessionState) => void): this;
}
