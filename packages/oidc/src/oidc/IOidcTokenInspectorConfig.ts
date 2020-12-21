/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Config for customizing the OIDC inspector
 */
export interface IOidcTokenInspectorConfig {
  /** the authentication method used to invoke the introspection endpoint */
  introspectionEndpointAuthMethod:
    | 'none'
    | 'client_secret_basic'
    | 'bearer_token';
}
