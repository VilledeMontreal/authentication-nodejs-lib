/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IClientCredentials } from '../creds/IClientCredentials';
import { IUserCredentials } from '../creds/IUserCredentials';
import { IOidcServerConfig } from './IOidcServerConfig';

/**
 * Config used to authenticate the OIDC client when starting an OIDC session
 */
export interface IOidcClientConfig {
  /**
   * The OIDC server that will issue the access tokens.
   * You can either provide the discovery url,
   * such as https://my.auth.server.com (which will be expanded into
   * https://my.auth.server.com/.well-known/openid-configuration),
   * or you can provide a custom IOidcServerConfig config.
   */
  issuer: string | IOidcServerConfig;

  /**
   * The client id and secret
   */
  client: IClientCredentials;

  /**
   * The optional username and password.
   * Note that it will use password grant in this case,
   * otherwise it would use the client_credentials grant.
   */
  user?: IUserCredentials;

  /**
   * The optional grant type. If not specified, it will be guessed:
   * providing the client and not the user would use the client_credentials grant,
   * whereas providing both client and user would use the password grant.
   * If you need the refresh_token grant, then you must be explicit.
   */
  grantType?: string;

  /**
   * The auth method used to provide the client id and secret.
   * It can be passed inside the authorization header, using Basic encoding,
   * or it can be passed inside the request's body, as additional fields.
   */
  authMethod: 'client_secret_basic' | 'client_secret_post';

  /**
   * The scopes required by the client.
   * It can be either a single string containing a list of space separated scopes,
   * or an array of scopes.
   */
  scopes?: string | string[];

  /**
   * request timeout for all requests issued toward the OIDC server endpoints.
   * This would override the global {IHttpDefaults.timeout} value.
   */
  requestTimeout?: number;
}
