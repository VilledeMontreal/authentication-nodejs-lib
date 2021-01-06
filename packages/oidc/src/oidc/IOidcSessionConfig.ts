/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpDefaults } from '@villedemontreal/auth-core/dist/http/IHttpDefaults';
// eslint-disable-next-line import/no-cycle
import { IOidcFactory } from './IOidcFactory';

/**
 * The config used to customize a new OIDC session
 */
export interface IOidcSessionConfig {
  /**
   * specifies if the session is allowed to use refresh tokens when renewing an expired token.
   * This is false by default.
   */
  canUseRefreshTokens?: boolean;
  /**
   * specifies if the session should start a timer to renew the token before it expires.
   * The benefit is that your current request won't be slowed down by the token acquisition
   * since it will be done out of band.
   * Note that timer will be scheduled only when the token has been used at least once during
   * the expiration period.
   * This is false by default.
   */
  scheduleRefresh?: boolean;

  /**
   * the optional factory when you need to replace or extend one of the components
   * used by the OIDC session, like the logger, the claims provider or the token store.
   */
  factory?: Partial<IOidcFactory>;

  /**
   * the optional HTTP defaults for any request sent to the associated IHttpClient
   */
  httpDefaults?: IHttpDefaults;
}
