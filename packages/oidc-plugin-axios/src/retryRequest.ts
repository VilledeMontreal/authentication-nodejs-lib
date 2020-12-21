/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { AxiosError } from 'axios';
import { IAxiosPlugin } from './IAxiosPlugin';
import { makeAxiosPlugin } from './makeAxiosPlugin';

export type CanRetryRequestCallback = (
  error: AxiosError,
) => boolean | undefined;

/**
 * plugin that will automatically retry a failed request if the error is safe to retry.
 * @param retries the number of times to retry a failed request
 * @param [canRetry] a callback voting for a retry or not. If it returns 'undefined',
 * then the callback will skip its vote.
 * @remarks
 * When using canRetry callbacks, the request will be retried as long as there is
 * at least one plugin voting for a retry.
 * If all plugins vote against, then it wont't be retried at all.
 * If no plugin votes, then a standard test for a transcient error will be performed,
 * such as lack of connectivity or >500 status code.
 * @example
 * const config: AxiosRequestConfig = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * retryRequest(2).bind(config);
 * const response = await axios.request(config);
 *
 * @example
 * const config: AxiosRequestConfig = {
 *   url: 'http://localhost:4004/secured/profile'
 * };
 * retryRequest(2, err => {
 *   if (err.response && err.response.status === 429) {
 *     return true;
 *   }
 *   return undefined;
 * }).bind(config);
 * const response = await axios.request(config);
 */
export function retryRequest(
  retries: number,
  canRetry?: CanRetryRequestCallback,
): IAxiosPlugin {
  return makeAxiosPlugin({
    //--------------------------------------------------------------------
    retries,
    //--------------------------------------------------------------------
    canRetry(config, err) {
      if (canRetry) {
        return canRetry(err);
      }
      return undefined;
    },
  });
}
