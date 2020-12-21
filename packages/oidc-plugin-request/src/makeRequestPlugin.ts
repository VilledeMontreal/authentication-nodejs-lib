/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { Request, Options, CoreOptions } from 'request';
import { addPlugins } from './customRequest';
import { IRequestPluginImplementation } from './IRequestPluginImplementation';

/**
 * Builds a new plugin from its implementation.
 * @param implementation the plugin callbacks
 * @returns the returned plugin can be bound to a CoreOptions
 * or a new Request instance.
 */
export function makeRequestPlugin(plugin: IRequestPluginImplementation) {
  return {
    bind: (target: Request | Options | CoreOptions) => {
      addPlugins(target, [plugin]);
    },
  };
}
