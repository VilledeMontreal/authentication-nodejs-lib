/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Claims about the authenticated user
 */
export interface IClaims {
  /**
   * gets a claim by its name
   */
  readonly [index: string]: string | number | boolean;
}
