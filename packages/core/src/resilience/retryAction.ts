/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { delay } from '../time/delay';

/**
 * Options for @see retryAction
 */
export interface IRetryActionOptions<T> {
  /** maximum number of retries.
   *  must be >= 0
   */
  maxRetries: number;

  /**  optional custom values for delays between each retry */
  delays?: number[];

  /** the action to be (re)tried */
  action: (attempt: number, lastError: any) => Promise<T>;

  /** a callback that will allow a retry or not */
  canRetry: (attempt: number, error: any) => Promise<boolean>;
}

/**
 *  a function that can retry a callback for maximum number of attempts,
 *  waiting for a specific delay between each attempt, only if the
 *  canRetry callback allows it.
 * @param options the options for the specifying the callback to retry and how.
 */
export async function retryAction<T>(
  options: IRetryActionOptions<T>,
): Promise<T> {
  let lastError: any = null;
  for (let i = 0; i < Math.max(0, options.maxRetries) + 1; i += 1) {
    try {
      return await options.action(i, lastError);
    } catch (err) {
      lastError = err;
      if (await options.canRetry(i, err)) {
        // apply exponential backoff before retrying
        const delays = options.delays || [25, 50, 100, 250, 500, 1000];
        await delay(delays[Math.min(i, delays.length - 1)]);
      } else {
        break;
      }
    }
  }
  throw lastError;
}
