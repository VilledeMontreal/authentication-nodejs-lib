/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IOidcServerConfig } from './IOidcServerConfig';

/**
 * Provider of an IOidcServerConfig using the discovery endpoint
 * of the OIDC server (.wellknown/openid-configuration)
 */
export interface IOidcServerConfigProvider {
  /**
   * Fetches the discovery document from the specified server.
   * Note that if you only specify the hostname (https://my.auth.server.com)
   * without adding ".well-known" in the url, then the provider
   * will automatically append the ".wellknown/openid-configuration" endpoint.
   * @param server the hostname of your OIDC server
   */
  getConfig(server: string): Promise<IOidcServerConfig>;
}
