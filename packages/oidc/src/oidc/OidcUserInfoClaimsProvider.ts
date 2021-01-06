/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpClient, IHttpRequest, ILogger } from '@villedemontreal/auth-core';
import { IClaims } from '../tokens/IClaims';
import { IClaimsProvider } from '../tokens/IClaimsProvider';
import { IOidcServerConfigGetter } from './IOidcServerConfigGetter';
import { IOidcClientConfig } from './IOidcClientConfig';

/**
 * Provider that will invoke the OIDC userinfo endpoint to retrieve
 * additional claims about the authenticated user.
 */
export class OidcUserInfoClaimsProvider implements IClaimsProvider {
  /**
   * creates a new instance of a OidcUserInfoClaimsProvider
   * @param logger a logger
   * @param httpClient a HTTP client
   * @param clientConfig the OIDC client config
   * @param serverConfigGetter a OIDC server config provider
   */
  constructor(
    private readonly logger: ILogger,
    private readonly httpClient: IHttpClient,
    private readonly clientConfig: IOidcClientConfig,
    private readonly serverConfigGetter: IOidcServerConfigGetter,
  ) {}

  /**
   * fetches claims about the authenticated user, using the provided access token
   * @param accessToken the token issued to authenticate a user
   */
  public async getClaims(accessToken: string): Promise<IClaims> {
    const config = await this.serverConfigGetter.getConfig();
    if (!config.userinfo_endpoint) {
      throw new Error('serverConfig.userinfo_endpoint is empty');
    }
    const search = new URLSearchParams();
    search.set('access_token', accessToken);
    const req: IHttpRequest = {
      headers: {
        accept: 'application/json',
      },
      timeout: this.clientConfig.requestTimeout,
      url: `${config.userinfo_endpoint}?${search.toString()}`,
    };
    this.logger.debug(
      { accessToken, endoint: config.userinfo_endpoint },
      `fetching claims of token ${accessToken}`,
    );
    const resp = await this.httpClient.send(req);
    return resp.body as IClaims;
  }
}
