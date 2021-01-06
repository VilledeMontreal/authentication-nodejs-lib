/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  IHttpClient,
  IHttpRequest,
  IHttpResponse,
  retryAction,
} from '@villedemontreal/auth-core';
import { IOidcSession } from './IOidcSession';
import { TokenSet } from '../tokens/TokenSet';
import { IOidcAuthenticatorConfig } from './IOidcAuthenticatorConfig';

/**
 * This OIDC HTTP Client wraps an existing IHttpClient in order to inject
 * the authorization header using the associated OIDC session.
 */
export class OidcHttpClient implements IHttpClient {
  /**
   *
   * @param httpClient the IHttpClient to extend
   * @param session the OIDC session that provides the access tokens
   * @param authenticatorConfig the config to customize this HTTP client
   */
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly session: IOidcSession,
    private readonly authenticatorConfig: IOidcAuthenticatorConfig = {},
  ) {}

  /**
   * Sends a HTTP request to a remote server
   * @param req the HTTP request to send to a remote server
   * @returns a HTTP response from the server
   * @throws HttpClientError when response status code is not within 200 to 299 range,
   *         or for any other exception.
   */
  public send(req: Readonly<IHttpRequest>): Promise<IHttpResponse> {
    if (!acceptsRequest(req, this.authenticatorConfig)) {
      return this.httpClient.send(req);
    }
    let token: TokenSet;
    return retryAction({
      maxRetries: 1,
      action: async (attempt, lastError) => {
        if (attempt > 0) {
          this.logLastAttempt(req, attempt, lastError);
        }
        token = await this.session.getToken();
        const newHeaders = {
          ...req.headers,
          authorization: token.toAuthorizationString(),
        };
        const newReq: IHttpRequest = {
          ...req,
          headers: newHeaders,
        };
        if (this.authenticatorConfig.beforeSendRequest) {
          await this.authenticatorConfig.beforeSendRequest(newReq, token);
        }
        return this.httpClient.send(newReq);
      },
      canRetry: async (attempt, error) => {
        if (this.authenticatorConfig.retryUnauthenticatedRequests === false) {
          return false;
        }
        if (error && error.statusCode === 401) {
          await this.session.deleteToken(token);
          return true;
        }
        return false;
      },
    });
  }

  private logLastAttempt(req: IHttpRequest, attempt: number, error: any) {
    const clonedError = { ...error };
    delete clonedError.response;
    const { url } = req;
    const method = req.method || 'GET';
    const { statusCode } = error;
    this.session.logger.error(
      { attempt, method, statusCode, url, error: clonedError },
      `OidcHttpClient: Attempt #${attempt} of ${method} ${url} failed with ${statusCode}. Retrying...`,
    );
  }
}

/**
 * tells if the OidcHttpClient can inject the authorization header into the submitted request
 * @param req the HTTP request to inspect
 * @param authenticatorConfig the config of the OidcHttpClient
 */
export function acceptsRequest(
  req: Readonly<IHttpRequest>,
  authenticatorConfig: IOidcAuthenticatorConfig,
) {
  // has already an authorization header?
  if (req.headers && typeof req.headers.authorization === 'string') {
    return false;
  }
  // does it pass our custom validator?
  if (
    authenticatorConfig.onAcceptRequest &&
    !authenticatorConfig.onAcceptRequest(req)
  ) {
    return false;
  }
  // does it pass our custom regex filter?
  if (
    authenticatorConfig.urlFilter &&
    !authenticatorConfig.urlFilter.test(req.url)
  ) {
    return false;
  }
  return true;
}
