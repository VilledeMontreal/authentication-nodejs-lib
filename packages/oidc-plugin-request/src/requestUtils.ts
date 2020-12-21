/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { Request } from 'request';

/**
 * returns the method and url of the config, while applying baseURL when necessary.
 * @param config the Axios config
 * @returns the method and url
 */
export function getRequestInfo(req: Request) {
  const method = (req.method || 'GET').toLocaleUpperCase();
  const url = req.uri.href;
  return {
    method,
    url,
  };
}
