/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { AxiosRequestConfig, AxiosInstance } from 'axios';

/**
 * Interface returned by a plugin in order to to bind it to
 * an existing AxiosRequestConfog or AxiosInstance.
 */
export interface IAxiosPlugin {
  /**
   * binds the plugin to an existing Axios config or instance
   * @param target the target object to bind the plugin to
   */
  bind(target: AxiosInstance | AxiosRequestConfig): void;
}
