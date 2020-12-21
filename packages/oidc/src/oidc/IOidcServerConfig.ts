/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * The OIDC server config that you can either provide
 * when configuring an IOidcClientConfig, or that you can receive
 * from the IOidcServerConfigProvider (the OIDC discovery)
 */
export interface IOidcServerConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  clientinfo_endpoint: string;
  check_session_iframe?: string;
  end_session_endpoint?: string;
  jwks_uri: string;
  registration_endpoint?: string;
  id_generation_endpoint?: string;
  introspection_endpoint?: string;
}
