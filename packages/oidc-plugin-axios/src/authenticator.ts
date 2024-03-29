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
import { getHeader, getRequestInfo } from './requestUtils';

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
    onStart: config => onStart(config, session, authenticatorConfig),

    //--------------------------------------------------------------------
    onError: (config, error) =>
      onError(config, error, session, authenticatorConfig),

    //--------------------------------------------------------------------
    canRetry(config: AxiosRequestConfig, error: AxiosError) {
      if (error.response && error.response.status === 401) {
        return authenticatorConfig?.retryUnauthenticatedRequests !== false;
      }
      return undefined;
    },
  });
}

async function onStart(
  config: AxiosRequestConfig,
  session: IOidcSession,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
): Promise<void> {
  if (canApplyAuthenticator(config, authenticatorConfig)) {
    enabledProperty.set(config, true);
    try {
      await injectTokenInHeaders(config, session, authenticatorConfig);
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
}

async function onError(
  config: AxiosRequestConfig,
  error: AxiosError,
  session: IOidcSession,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
): Promise<void> {
  const res = error.response;
  const token = tokenProperty.get(config);
  if (
    res &&
    res.status === 401 &&
    token &&
    token.toAuthorizationString() ===
      (getHeader(config, 'Authorization') || getHeader(config, 'authorization'))
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
}

function canApplyAuthenticator(
  config: AxiosRequestConfig,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
): boolean {
  if (enabledProperty.get(config)) {
    // if we already allowed the authenticator, it means that we are retrying and thus
    // that can apply the authenticator since we already did it once.
    return true;
  }
  if (
    getHeader(config, 'Authorization') ||
    getHeader(config, 'authorization')
  ) {
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
  session: IOidcSession,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
): Promise<TokenSet> {
  const token = await session.getToken();
  config.headers = {
    ...config.headers,
    authorization: token.toAuthorizationString(),
  };
  tokenProperty.set(config, token);
  if (authenticatorConfig && authenticatorConfig.beforeSendRequest) {
    try {
      await authenticatorConfig.beforeSendRequest(config, token);
    } catch (err: any) {
      err.config = config;
      throw err;
    }
  }
  return token;
}
