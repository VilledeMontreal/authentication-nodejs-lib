/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IClaims } from './IClaims';
import { IClaimsProvider } from './IClaimsProvider';

/**
 * Fake implementation of a IClaimsProvider used for unit tests
 */
export class FakeClaimsProvider implements IClaimsProvider {
  /**
   * creates a new instance of a FakeClaimsProvider
   * @param claims the fake claims to return
   */
  constructor(private readonly claims: IClaims) {}

  /**
   * fetches claims about the authenticated user, using the provided access token
   * @param accessToken the token issued to authenticate a user
   */
  public getClaims(accessToken: string): Promise<IClaims> {
    return Promise.resolve(this.claims);
  }
}
