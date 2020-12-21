/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { TokenSet } from '../tokens/TokenSet';

/**
 * Config used to customize authenticator plugins, and also for the OidcHttpClient.
 */
export interface IOidcAuthenticatorConfig {
  /**
   * Specifies if the authenticator should force a token refresh and
   * retry the http request if it received a 401 status code.
   * Note that it will be retried only once and that it defaults to true.
   */
  retryUnauthenticatedRequests?: boolean;

  /**
   * Custom filter that will only authenticate the requests matching the regex
   */
  urlFilter?: RegExp;

  /**
   * Callback used to filter out requests that don't need to be authenticated
   * @param req the request object used by the http client.
   */
  onAcceptRequest?: (req: any) => boolean;

  /**
   * Callback triggered just before sending the authenticated request
   * using the HTTP client.
   */
  beforeSendRequest?: (req: any, token: TokenSet) => Promise<void>;
}
