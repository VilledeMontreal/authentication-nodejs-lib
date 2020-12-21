/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { TokenSet } from './TokenSet';

/**
 * The access token provider.
 * It knows how to request new tokens or refresh existing ones from
 * the OIDC token endpoint.
 */
export interface ITokenProvider {
  /**
   * requests a new access token
   */
  getToken(): Promise<TokenSet>;

  /**
   * requests a new access token by providing an existing refresh token
   * @param refreshToken a valid refresh token
   */
  refreshToken(refreshToken: string): Promise<TokenSet>;
}
