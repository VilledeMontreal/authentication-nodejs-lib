/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { AxiosRequestConfig } from 'axios';
import { combinePath } from '@villedemontreal/auth-core';

/**
 * returns the method and url of the config, while applying baseURL when necessary.
 * @param config the Axios config
 * @returns the method and url
 */
export function getRequestInfo(config: AxiosRequestConfig) {
  const method = (config.method || 'GET').toLocaleUpperCase();
  let { url } = config;
  if (!url) {
    url = config.baseURL;
  } else if (!url.startsWith('http') && config.baseURL) {
    url = combinePath(config.baseURL, url);
  }
  if (!url) {
    url = '/';
  }
  return {
    method,
    url,
  };
}

export function getHeader(
  config: AxiosRequestConfig,
  name: string,
): string | undefined {
  if (config.headers) {
    return config.headers[name];
  }
  return undefined;
}
