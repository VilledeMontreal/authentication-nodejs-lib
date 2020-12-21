/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ILogger } from '@villemontreal/auth-core';
import { ITokenStore } from './ITokenStore';
import { TokenSet } from './TokenSet';

/**
 * Implementation of a ITokenStore in memory
 */
export class InMemoryTokenStore implements ITokenStore {
  private token?: TokenSet;

  /**
   * creates a new instance of a InMemoryTokenStore
   * @param logger a logger
   */
  constructor(private readonly logger: ILogger) {}

  /**
   * adds the submitted token to this store
   * @param token a token
   */
  public add(token: TokenSet): Promise<void> {
    if (token) {
      this.logger.debug(
        {
          newToken: this.redactToken(token),
          oldToken: this.redactToken(this.token),
        },
        'Store token',
      );
      this.token = token;
    } else {
      this.logger.debug(
        {
          oldToken: this.redactToken(this.token),
        },
        'Cannot store token because new token is undefined',
      );
      this.token = undefined;
    }
    return Promise.resolve();
  }

  /**
   * gets the current token, if any
   */
  public get(): Promise<TokenSet | undefined> {
    return Promise.resolve(this.token);
  }

  /**
   * deletes the submitted token from the store
   * @param token a token
   */
  public delete(token: TokenSet): Promise<void> {
    if (this.token && this.token.equals(token)) {
      this.logger.debug(
        {
          currentToken: this.redactToken(this.token),
          tokenToDelete: this.redactToken(token),
        },
        'Delete token',
      );
      this.token = undefined;
    }
    return Promise.resolve();
  }

  private redactToken(token?: TokenSet) {
    if (token) {
      return token.toRedactedJSON();
    }
    return undefined;
  }
}
