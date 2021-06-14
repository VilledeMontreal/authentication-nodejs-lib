/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  ITimeProvider,
  SynchronizedAsyncCachedValue,
} from '@villedemontreal/auth-core';
import { IClaims } from './IClaims';
import { IClaimsProvider } from './IClaimsProvider';

/**
 * A set of access tokens and user claims.
 * Note that the claims will be dynamically fetched on the first access,
 * using the associated IClaimsProvider, then cached.
 */
export class TokenSet {
  /** a time provider */
  public readonly timeProvider: ITimeProvider;
  /** an access token */
  public readonly access_token: string;
  /** a token type */
  public readonly token_type: string;
  /** an expiration delay in seconds */
  public readonly expires_in: number;
  /** an optional id_token */
  public readonly id_token?: string;
  /** an optional refresh token */
  public readonly refresh_token?: string;
  /** the requested scope */
  public readonly scope?: string;
  /** an optional claims provider */
  public readonly claimsProvider?: IClaimsProvider;
  /**  an optional token issuer */
  public readonly issuer?: string;

  public readonly createdAt: Date;

  public readonly expiresAt: Date;

  public readonly expirationOffset: number;

  private readonly claims: SynchronizedAsyncCachedValue<IClaims>;

  /**
   *
   * @param args a set of properties for the new TokenSet
   */
  constructor(
    args: {
      /** a time provider */
      timeProvider: ITimeProvider;
      /** an access token */
      access_token: string;
      /** a token type */
      token_type: string;
      /** an expiration delay in seconds */
      expires_in: number;
      /** an optional id_token */
      id_token?: string;
      /** an optional refresh token */
      refresh_token?: string;
      /** the requested scope */
      scope?: string;
      /** an optional claims provider */
      claimsProvider?: IClaimsProvider;
      /**  an optional token issuer */
      issuer?: string;
    }
  ) {
    if (!args) {
      throw new Error('Expected to receive args');
    }
    if (!args.access_token) {
      throw new Error('Expected to receive an access_token');
    }
    if (!args.token_type) {
      throw new Error('Expected to receive a token_type');
    }
    if (args.expires_in < 1) {
      throw new Error('Expected expires_in to be >= 1');
    }
    this.timeProvider = args.timeProvider;
    this.access_token = args.access_token;
    this.token_type = args.token_type;
    this.expires_in = args.expires_in;
    this.id_token = args.id_token;
    this.refresh_token = args.refresh_token;
    this.scope = args.scope;
    this.claimsProvider = args.claimsProvider;
    this.issuer = args.issuer;
    this.expirationOffset = this.calcExpirationOffsetInSecs(args.expires_in);
    this.createdAt = new Date(args.timeProvider.getNow().getTime());
    this.expiresAt = new Date(
      this.createdAt.getTime() + (args.expires_in - this.expirationOffset) * 1000,
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
