/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Interface that a plugin can implement in order to extend Axios requests.
 */
export interface IAxiosPluginImplementation {
  /**
   * specifies if the plugin requires a number of retries
   * @remarks
   * the request will take the max of all the requested retries.
   */
  retries?: number;
  /**
   * triggered before executing the request
   * @param config the Axios config
   */
  onStart?(config: AxiosRequestConfig): Promise<void>;

  /**
   * triggered if the request execution was successful
   * @param config the Axios config
   * @param response the Axios response
   */
  onSuccess?(
    config: AxiosRequestConfig,
    response: AxiosResponse,
  ): Promise<void>;

  /**
   * triggered if the request execution was a failure
   * @param config the Axios config
   * @param error the Axios error
   */
  onError?(config: AxiosRequestConfig, error: AxiosError): Promise<void>;

  /**
   * triggered if the request execution was a failure,
   * to decide if the request should be retried or not.
   * @param config the Axios config
   * @param error the Axios error
   */
  canRetry?(config: AxiosRequestConfig, error: AxiosError): boolean | undefined;
}
