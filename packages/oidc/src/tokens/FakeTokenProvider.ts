/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { delay, ITimeProvider } from '@villedemontreal/auth-core';
import { TokenSet } from '..';
import { IClaimsProvider } from './IClaimsProvider';

/**
 * Fake token provider used for unit tests.
 */
export class FakeTokenProvider {
  /** Tells if this provider can produce new tokens */
  public canProduceTokens = true;

  /** Tells if this provider can produce refresh tokens */
  public canProduceRefreshTokens = true;

  /** Tells if this provider can generate refresh tokens as long as access tokens */
  public canGenerateRefreshTokens = true;

  /** token expiration in secs */
  public expirationInSecs = 300;

  private tokenCounter = 0;

  /**
   * creates a new instance of a FakeTokenProvider
   * @param timeProvider a time provider
   * @param [claimsProvider] a claims provider
   */
  constructor(
    private readonly timeProvider: ITimeProvider,
    private readonly claimsProvider?: IClaimsProvider,
  ) {}

  /**
   * requests a new access token
   */
  public async getToken(): Promise<TokenSet> {
    if (!this.canProduceTokens) {
      throw new Error('Could not get token');
    }
    await delay(50);
    return this.generateToken();
  }

  /**
   * requests a new access token by providing an existing refresh token
   * @param refreshtoken a valid refresh token
   */
  public async refreshToken(refreshtoken: string): Promise<TokenSet> {
    if (!this.canProduceRefreshTokens) {
      throw new Error('Could not refresh token');
    }
    await delay(50);
    return this.generateToken();
  }

  private generateToken() {
    this.tokenCounter += 1;
    return new TokenSet(
      this.timeProvider,
      `token${this.tokenCounter}`,
      'Bearer',
      this.expirationInSecs,
      '',
      this.canGenerateRefreshTokens
        ? `refreshtoken${this.tokenCounter}`
        : undefined,
      'scope',
      this.claimsProvider,
      'https://fake.token.issuer',
    );
  }
}
