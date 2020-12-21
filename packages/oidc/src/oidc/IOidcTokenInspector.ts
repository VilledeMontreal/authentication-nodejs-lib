/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IClaims } from '../tokens/IClaims';
import { IOidcTokenInfo } from './IOidcTokenInfo';

/**
 * The token inspector that can do some introspection on the
 * access tokens emitted by the OIDC server.
 */
export interface IOidcTokenInspector {
  /**
   * gets information on the submitted accessToken.
   * Useful to know if the token is still active.
   * @param accessToken the access token
   * @param tokenTypeHint the hint
   */
  getTokenInfo(
    accessToken: string,
    tokenTypeHint?: string,
  ): Promise<IOidcTokenInfo>;

  /**
   * gets information on the OIDC client for which the token
   * was emitted.
   * @param accessToken the access token
   */
  getClientInfo(accessToken: string): Promise<any>;

  /**
   * gets a list of claims about the authenticated user.
   * The list will depend on the requested client scopes.
   * @param accessToken the access token
   */
  getUserInfo(accessToken: string): Promise<IClaims>;
}
