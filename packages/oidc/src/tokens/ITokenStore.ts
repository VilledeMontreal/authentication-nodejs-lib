/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { TokenSet } from './TokenSet';

/**
 * Token store
 */
export interface ITokenStore {
  /**
   * adds the submitted token to this store
   * @param token a token
   */
  add(token: TokenSet): Promise<void>;

  /**
   * gets the current token, if any
   */
  get(): Promise<TokenSet | undefined>;

  /**
   * deletes the submitted token from the store
   * @param token a token
   */
  delete(token: TokenSet): Promise<void>;
}
