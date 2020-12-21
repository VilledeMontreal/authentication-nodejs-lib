/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { Request, Options, CoreOptions } from 'request';

/**
 * Interface returned by a plugin in order to to bind it to
 * an existing Request or CoreOptions instance.
 */
export interface IRequestPlugin {
  /**
   * binds the plugin to an existing Request config or instance
   * @param target the target object to bind the plugin to
   */
  bind(target: Request | Options | CoreOptions): void;
}
