/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { Request, Response } from 'request';

/**
 * Interface that a plugin can implement in order to extend Request requests.
 */
export interface IRequestPluginImplementation {
  /**
   * specifies if the plugin requires a number of retries
   * @remarks
   * the request will take the max of all the requested retries.
   */
  retries?: number;

  /**
   * triggered before executing the request
   * @param req the request to execute
   */
  onStart?(req: Request): Promise<void>;

  /**
   * triggered if the request was able to produce a response
   * @param req the request
   * @param response the response
   * @param [body] the optional response's body
   */
  onComplete?(
    req: Request,
    response: Response,
    body?: undefined,
  ): Promise<void>;

  /**
   * triggered if the request execution was a failure
   * @param error the error
   * @param req the request
   * @param [res] the optional response
   */
  onError?(error: Error, req: Request, res?: Response): Promise<void>;
}
