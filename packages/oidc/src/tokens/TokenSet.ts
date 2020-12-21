/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  ITimeProvider,
  SynchronizedAsyncCachedValue,
} from '@villemontreal/auth-core';
import { IClaims } from './IClaims';
import { IClaimsProvider } from './IClaimsProvider';

/**
 * A set of access tokens and user claims.
 * Note that the claims will be dynamically fetched on the first access,
 * using the associated IClaimsProvider, then cached.
 */
export class TokenSet {
  public readonly createdAt: Date;

  public readonly expiresAt: Date;

  public readonly expirationOffset: number;

  private readonly claims: SynchronizedAsyncCachedValue<IClaims>;

  /**
   *
   * @param timeProvider a time provider
   * @param access_token an access token
   * @param token_type a token type
   * @param expires_in an expiration delay in seconds
   * @param [id_token] an optional id_token
   * @param refresh_token an optional refresh token
   * @param [scope] the requested scope
   * @param claimsProvider an optional claims provider
   * @param [issuer] an optional token issuer
   */
  constructor(
    public readonly timeProvider: ITimeProvider,
    public readonly access_token: string,
    public readonly token_type: string,
    public readonly expires_in: number,
    public readonly id_token?: string,
    public readonly refresh_token?: string,
    public readonly scope?: string,
    public readonly claimsProvider?: IClaimsProvider,
    public readonly issuer?: string,
  ) {
    if (!access_token) {
      throw new Error('Expected to receive an access_token');
    }
    if (!token_type) {
      throw new Error('Expected to receive a token_type');
    }
    if (expires_in < 1) {
      throw new Error('Expected expires_in to be >= 1');
    }
    this.expirationOffset = this.calcExpirationOffsetInSecs(expires_in);
    this.createdAt = new Date(timeProvider.getNow().getTime());
    this.expiresAt = new Date(
      this.createdAt.getTime() + (expires_in - this.expirationOffset) * 1000,
    );
    this.claims = new SynchronizedAsyncCachedValue<IClaims>(previousValue =>
      this.claimsProvider
        ? this.claimsProvider.getClaims(this.access_token)
        : Promise.resolve({}),
    );
  }

  /**
   * tells if this TokenSet is the same as the other one
   * @param other another TokenSet
   */
  public equals(other: TokenSet): boolean {
    if (!other) {
      return false;
    }
    return (
      this.access_token === other.access_token &&
      this.refresh_token === other.refresh_token &&
      this.id_token === other.id_token &&
      this.token_type === other.token_type &&
      this.expires_in === other.expires_in
    );
  }

  /**
   * tells if this TokenSet already resolved claims
   */
  public hasClaims(): boolean {
    return this.claims.getCachedValue() !== undefined;
  }

  /**
   * gets the cached claims or fetches them using the IClaimsProvider
   */
  public getClaims(): Promise<IClaims> {
    return this.claims.getValue();
  }

  /**
   * tells if the access token has expired
   */
  public hasExpired(): boolean {
    return this.timeProvider.getNow().getTime() >= this.expiresAt.getTime();
  }

  /**
   * converts the content of this TokenSet to a plain Javascript object
   */
  public toJSON() {
    return {
      access_token: this.access_token,
      claims: this.claims.getCachedValue(),
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      expires_in: this.expires_in,
      id_token: this.id_token,
      refresh_token: this.refresh_token,
      token_type: this.token_type,
      scope: this.scope,
      issuer: this.issuer,
    };
  }

  /**
   * converts the content of this TokenSet to a plain Javascript object
   * with redacted tokens. This is used when logging, to avoid leaking information.
   */
  public toRedactedJSON() {
    return {
      access_token: this.redactString(this.access_token),
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
      expires_in: this.expires_in,
      id_token: this.redactString(this.id_token),
      refresh_token: this.redactString(this.refresh_token),
      token_type: this.token_type,
      scope: this.scope,
      issuer: this.issuer,
    };
  }

  /**
   * formats the access token and its type as a standard HTTP authorization header.
   */
  public toAuthorizationString() {
    return `${this.token_type} ${this.access_token}`;
  }

  private calcExpirationOffsetInSecs(expiresIn: number) {
    if (expiresIn <= 5) {
      return 0;
    }
    if (expiresIn <= 20) {
      return 1;
    }
    if (expiresIn <= 60) {
      return 5;
    }
    if (expiresIn <= 60 * 5) {
      return 30;
    }
    return 60;
  }

  private redactString(value?: string) {
    if (value) {
      return `${value.substr(0, 4)}...${value.substr(value.length - 4)}`;
    }
    return value;
  }
}
