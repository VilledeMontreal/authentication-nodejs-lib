/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  IOidcSession,
  IOidcAuthenticatorConfig,
  TokenSet,
} from '@villedemontreal/auth-oidc';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { cleanupHttpError, TypedProperty } from '@villedemontreal/auth-core';
import { makeAxiosPlugin } from './makeAxiosPlugin';
import { getRequestInfo } from './requestUtils';

const enabledProperty = new TypedProperty<boolean, AxiosRequestConfig>(
  Symbol('hasAuthenticator'),
);
const tokenProperty = new TypedProperty<TokenSet, AxiosRequestConfig>(
  Symbol('token'),
);

/**
 *
 * @param session the OIDC session used to provide the access tokens
 * @param [authenticatorConfig] the config for customizing this authenticator
 */
export function authenticator(
  session: IOidcSession,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
) {
  return makeAxiosPlugin({
    //--------------------------------------------------------------------
    retries:
      authenticatorConfig?.retryUnauthenticatedRequests !== false ? 1 : 0,
    //--------------------------------------------------------------------
    async onStart(config: AxiosRequestConfig): Promise<void> {
      if (canApplyAuthenticator(config)) {
        enabledProperty.set(config, true);
        try {
          await injectTokenInHeaders(config);
        } catch (err) {
          const { method, url } = getRequestInfo(config);
          session.logger.error(
            {
              error: cleanupHttpError(err),
              method,
              url,
            },
            `Could not inject valid access token into request headers of ${method} ${url}`,
          );
          throw err;
        }
      }
    },
    //--------------------------------------------------------------------
    async onError(
      config: AxiosRequestConfig,
      error: AxiosError,
    ): Promise<void> {
      const res = error.response;
      const token = tokenProperty.get(config);
      if (
        res &&
        res.status === 401 &&
        token &&
        token.toAuthorizationString() ===
          (config.headers.Authorization || config.headers.authorization)
      ) {
        try {
          // ensure that we don't use the token any more since the request returned a 401
          await session.deleteToken(token);
          tokenProperty.clear(config);
        } catch (e) {
          const { method, url } = getRequestInfo(config);
          session.logger.error(
            {
              error: cleanupHttpError(e),
              method,
              url,
            },
            'Could not delete bad token from session',
          );
        }
      }
    },
    //--------------------------------------------------------------------
    canRetry(config: AxiosRequestConfig, error: AxiosError) {
      if (error.response && error.response.status === 401) {
        return authenticatorConfig?.retryUnauthenticatedRequests !== false;
      }
      return undefined;
    },
  });
  //--------------------------------------------------------------------

  function canApplyAuthenticator(config: AxiosRequestConfig): boolean {
    if (enabledProperty.get(config)) {
      // if we already allowed the authenticator, it means that we are retrying and thus
      // that can apply the authenticator since we already did it once.
      return true;
    }
    if (config.headers.Authorization || config.headers.authorization) {
      return false;
    }
    if (authenticatorConfig && authenticatorConfig.onAcceptRequest) {
      if (!authenticatorConfig.onAcceptRequest(config)) {
        return false;
      }
    }
    if (authenticatorConfig && authenticatorConfig.urlFilter) {
      const { url } = getRequestInfo(config);
      if (!authenticatorConfig.urlFilter.test(url)) {
        return false;
      }
    }
    return true;
  }

  async function injectTokenInHeaders(
    config: AxiosRequestConfig,
  ): Promise<TokenSet> {
    const token = await session.getToken();
    // eslint-disable-next-line no-param-reassign
    config.headers.authorization = token.toAuthorizationString();
    tokenProperty.set(config, token);
    if (authenticatorConfig && authenticatorConfig.beforeSendRequest) {
      try {
        await authenticatorConfig.beforeSendRequest(config, token);
      } catch (err) {
        err.config = config;
        throw err;
      }
    }
    return token;
  }
}
