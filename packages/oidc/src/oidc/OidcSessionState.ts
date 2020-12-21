/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * enum for the allowed OIDC session states
 */
export enum OidcSessionState {
  uninitialized = 'uninitialized',
  acquiringToken = 'acquiringToken',
  refreshingToken = 'refreshingToken',
  tokenAcquired = 'tokenAcquired',
  tokenExpired = 'tokenExpired',
  error = 'error',
}
