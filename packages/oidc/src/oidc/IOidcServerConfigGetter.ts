/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IOidcServerConfig } from './IOidcServerConfig';

/**
 * The provider that will return the current IOidcServerConfig,
 * which may come either from the discovery endpoint (.wellknown/openid-configuration)
 * or from a custom config specified within the IOidcClientConfig.
 */
export interface IOidcServerConfigGetter {
  /**
   * gets the current IOidcServerConfig
   */
  getConfig(): Promise<IOidcServerConfig>;
}
