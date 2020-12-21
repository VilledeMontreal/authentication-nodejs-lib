/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcServerConfig } from './IOidcServerConfig';
import { IOidcServerConfigGetter } from './IOidcServerConfigGetter';
import { IOidcServerConfigProvider } from './IOidcServerConfigProvider';

/**
 * The provider that will return the current IOidcServerConfig,
 * which may come either from the discovery endpoint (.wellknown/openid-configuration)
 * or from a custom config specified within the IOidcClientConfig.
 */
export class OidcServerConfigGetter implements IOidcServerConfigGetter {
  /**
   * creates a new instance of a OidcServerConfigGetter
   * @param serverConfigProvider the provider of IOidcServerConfig
   * @param clientConfig the client config, that might contain a custom server config
   */
  constructor(
    private readonly serverConfigProvider: IOidcServerConfigProvider,
    private readonly clientConfig: IOidcClientConfig,
  ) {}

  /**
   * gets the current IOidcServerConfig
   */
  public async getConfig(): Promise<IOidcServerConfig> {
    if (typeof this.clientConfig.issuer === 'string') {
      return this.serverConfigProvider.getConfig(this.clientConfig.issuer);
    }
    return Promise.resolve(this.clientConfig.issuer);
  }
}
