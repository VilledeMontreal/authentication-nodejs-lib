/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IClaims } from './IClaims';

/**
 * Provider that can issue claims about the authenticated user
 */
export interface IClaimsProvider {
  /**
   * fetches claims about the authenticated user, using the provided access token
   * @param accessToken the token issued to authenticate a user
   */
  getClaims(accessToken: string): Promise<IClaims>;
}
