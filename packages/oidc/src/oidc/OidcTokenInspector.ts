/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IHttpRequest, StandardContentTypes } from '@villedemontreal/auth-core';
import { OutgoingHttpHeaders } from 'http';
import { IClaims } from '../tokens/IClaims';
import { IOidcSession } from './IOidcSession';
import { IOidcTokenInfo } from './IOidcTokenInfo';
import { OidcHttpClient } from './OidcHttpClient';
// eslint-disable-next-line import/no-cycle
import { encodeBasicAuth } from './OidcTokenProvider';

const AccessTokenIsRequiredMessage = 'accessToken is required';

export interface IOidcTokenInspectorConfig {
  introspectionEndpointAuthMethod:
    | 'none'
    | 'client_secret_basic'
    | 'bearer_token';
}
/**
 * The token inspector that can do some introspection on the
 * access tokens emitted by the OIDC server.
 */
export class OidcTokenInspector {
  /**
   * creates a new instance of an OidcTokenInspector
   * @param session the OIDC session
   * @param config the inspector config
   */
  constructor(
    private readonly session: IOidcSession,
    private readonly config: IOidcTokenInspectorConfig,
  ) {}

  /**
   * gets information on the submitted accessToken.
   * Useful to know if the token is still active.
   * @param accessToken the access token
   * @param [tokenTypeHint] the hint
   */
  public async getTokenInfo(
    accessToken: string,
    tokenTypeHint?: string,
  ): Promise<IOidcTokenInfo> {
    if (!accessToken) {
      throw new Error(AccessTokenIsRequiredMessage);
    }
    const serverConfig = await this.session.getServerConfig();
    if (!serverConfig.introspection_endpoint) {
      throw new Error('serverConfig.introspection_endpoint is empty');
    }
    let { httpClient } = this.session;
    if (this.config.introspectionEndpointAuthMethod === 'bearer_token') {
      httpClient = new OidcHttpClient(this.session.httpClient, this.session);
    }
    const introspectionRequest: any = {
      token: accessToken,
    };
    if (tokenTypeHint) {
      introspectionRequest.token_type_hint = tokenTypeHint;
    }
    const req: IHttpRequest = {
      body: introspectionRequest,
      headers: {
        ...this.getAuthHeader(),
        accept: StandardContentTypes.applicationJson,
        'content-type': StandardContentTypes.applicationForm,
      },
      method: 'POST',
      timeout: this.session.clientConfig.requestTimeout,
      url: serverConfig.introspection_endpoint,
    };
    const resp = await httpClient.send(req);
    return resp.body as IOidcTokenInfo;
  }

  /**
   * gets information on the OIDC client for which the token
   * was emitted.
   * @param accessToken the access token
   */
  public async getClientInfo(accessToken: string): Promise<any> {
    if (!accessToken) {
      throw new Error(AccessTokenIsRequiredMessage);
    }
    const serverConfig = await this.session.getServerConfig();
    if (!serverConfig.clientinfo_endpoint) {
      throw new Error('serverConfig.clientinfo_endpoint is empty');
    }
    const req: IHttpRequest = {
      headers: {
        accept: StandardContentTypes.applicationJson,
      },
      timeout: this.session.clientConfig.requestTimeout,
      url: formatUrl(serverConfig.clientinfo_endpoint, accessToken),
    };
    const resp = await this.session.httpClient.send(req);
    return resp.body;
  }

  /**
   * gets a list of claims about the authenticated user.
   * The list will depend on the requested client scopes.
   * @param accessToken the access token
   */
  public async getUserInfo(accessToken: string): Promise<IClaims> {
    if (!accessToken) {
      throw new Error(AccessTokenIsRequiredMessage);
    }
    const serverConfig = await this.session.getServerConfig();
    if (!serverConfig.userinfo_endpoint) {
      throw new Error('serverConfig.userinfo_endpoint is empty');
    }
    const req: IHttpRequest = {
      headers: {
        accept: StandardContentTypes.applicationJson,
      },
      timeout: this.session.clientConfig.requestTimeout,
      url: formatUrl(serverConfig.userinfo_endpoint, accessToken),
    };
    const resp = await this.session.httpClient.send(req);
    return resp.body as IClaims;
  }

  private getAuthHeader(): OutgoingHttpHeaders {
    if (this.config.introspectionEndpointAuthMethod === 'client_secret_basic') {
      return {
        authorization: encodeBasicAuth(
          this.session.clientConfig.client.id,
          this.session.clientConfig.client.secret,
        ),
      };
    }
    // Note that if we don't set the Authorization header and if auth method is bearer_token,
    // then it will be automatically defined with a Bearer token using the associated OIDC session.
    return {};
  }
}

function formatUrl(url: string, accessToken: string) {
  const search = new URLSearchParams();
  search.set('access_token', accessToken);
  return `${url}?${search.toString()}`;
}
