/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  capitalize,
  IHttpClient,
  IHttpRequest,
  ILogger,
  ITimeProvider,
} from '@villedemontreal/auth-core';
import { OutgoingHttpHeaders } from 'http';
// eslint-disable-next-line import/no-cycle
import { TokenSet } from '..';
import { IClaimsProvider } from '../tokens/IClaimsProvider';
import { ITokenProvider } from '../tokens/ITokenProvider';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcServerConfigGetter } from './IOidcServerConfigGetter';
import { IOidcServerConfig } from './IOidcServerConfig';

/**
 * The access token provider.
 * It knows how to request new tokens or refresh existing ones from
 * the OIDC token endpoint.
 */
export class OidcTokenProvider implements ITokenProvider {
  constructor(
    logger: ILogger,
    private readonly httpClient: IHttpClient,
    private readonly serverConfigGetter: IOidcServerConfigGetter,
    private readonly clientConfig: IOidcClientConfig,
    private readonly timeProvider: ITimeProvider,
    private readonly claimsProvider?: IClaimsProvider,
  ) {}

  /**
   * requests a new access token
   */
  public async getToken(): Promise<TokenSet> {
    const { req, serverConfig } = await this.createTokenRequest();
    const res = await this.httpClient.send(req);
    return this.createTokenSetFrom(res.body, serverConfig);
  }

  /**
   * requests a new access token by providing an existing refresh token
   * @param refreshToken a valid refresh token
   */
  public async refreshToken(refreshToken: string): Promise<TokenSet> {
    const { req, serverConfig } = await this.createTokenRequest(refreshToken);
    const res = await this.httpClient.send(req);
    return this.createTokenSetFrom(res.body, serverConfig);
  }

  private async createTokenRequest(refreshToken?: string) {
    const serverConfig = await this.serverConfigGetter.getConfig();
    if (!serverConfig.token_endpoint) {
      throw new Error('serverConfig.token_endpoint is empty');
    }
    if (
      !this.clientConfig.client ||
      !this.clientConfig.client.id ||
      !this.clientConfig.client.secret
    ) {
      throw new Error('clientConfig.client is empty');
    }
    const headers: OutgoingHttpHeaders = {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    };
    const grantType = guessGrantType(this.clientConfig, refreshToken);
    const body: any = {
      grant_type: grantType,
      scope: serializeScopes(this.clientConfig.scopes),
    };
    switch (this.clientConfig.authMethod) {
      case 'client_secret_basic':
        headers.authorization = encodeBasicAuth(
          this.clientConfig.client.id,
          this.clientConfig.client.secret,
        );
        break;

      case 'client_secret_post':
        body.client_id = this.clientConfig.client.id;
        body.client_secret = this.clientConfig.client.secret;
        break;

      default:
        throw new Error(
          `Unexpected auth method "${this.clientConfig.authMethod}"`,
        );
    }
    switch (grantType) {
      case 'client_credentials':
        break;

      case 'password':
        if (!this.clientConfig.user) {
          // tslint:disable-next-line: max-line-length
          throw new Error(
            'Expected to receive a user in the OIDC client config for password grant',
          );
        }
        body.username = this.clientConfig.user.username;
        body.password = this.clientConfig.user.password;
        break;

      case 'refresh_token':
        if (!refreshToken) {
          throw new Error('Expected to receive a refresh token');
        }
        body.refresh_token = refreshToken;
        break;

      default:
        throw new Error(`Unexpected grant type "${grantType}"`);
    }
    const req: IHttpRequest = {
      body,
      headers,
      method: 'POST',
      timeout: this.clientConfig.requestTimeout,
      url: serverConfig.token_endpoint,
    };
    return {
      req,
      serverConfig,
    };
  }

  private createTokenSetFrom(body: any, serverConfig: IOidcServerConfig) {
    // Note that we need to capitalize the token_type received by the Gluu server
    // that might return a lowercase 'bearer' which would then cause
    // errors when used in the authorization header, with token.toAuthorizationString().
    return new TokenSet(
      this.timeProvider,
      body.access_token,
      capitalize(body.token_type),
      body.expires_in,
      body.id_token,
      body.refresh_token,
      body.scope,
      this.claimsProvider,
      serverConfig.issuer,
    );
  }
}
/**
 * will sniff the provided parameters in order to guess the proper OAuth grant type to use
 * for requesting a new access token.
 * @param clientConfig the client config to guess from
 * @param [refreshToken] the optional refresh token which would force the 'refresh_token' grant type.
 */
export function guessGrantType(
  clientConfig: IOidcClientConfig,
  refreshToken?: string,
) {
  if (refreshToken) {
    return 'refresh_token';
  }
  if (clientConfig.grantType) {
    return clientConfig.grantType;
  }
  if (clientConfig.user) {
    return 'password';
  }
  return 'client_credentials';
}

/**
 * serializes an optionali string or list of strings as a single string,
 * where the scopes would be separated by a single space.
 * @param [scopes] the scopes to serialize as a simple string
 */
export function serializeScopes(scopes?: string | string[]) {
  if (!scopes) {
    return '';
  }
  if (typeof scopes === 'string') {
    return scopes;
  }
  return scopes.join(' ');
}

/**
 * returns a Base64 encoded string containing the submitted
 * username and password.
 * @param username the username
 * @param password the password
 * @remarks this is the standard way to encode credentials for HTTP requests
 * using the 'Basic' encoding in the Authorization header.
 */
export function encodeBasicAuth(username: string, password: string) {
  if (!username) {
    throw new Error('username is required');
  }
  if (!password) {
    throw new Error('password is required');
  }
  if (username.indexOf(':') >= 0) {
    throw new Error('username cannot contain ":"');
  }
  const auth = `${username}:${password}`;
  const basic = Buffer.from(auth).toString('base64');
  return `Basic ${basic}`;
}
