/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { hookMethod, TypedProperty } from '@villedemontreal/auth-core';
import {
  IOidcSession,
  IOidcAuthenticatorConfig,
  TokenSet,
} from '@villedemontreal/auth-oidc';
import * as superagent from 'superagent';

const tokenProperty = new TypedProperty<TokenSet, superagent.SuperAgentRequest>(
  Symbol('token'),
);

/**
 *
 * @param session the OIDC session used to provide the access tokens
 * @param [config] the config for customizing this authenticator
 */
export function authenticator(
  session: IOidcSession,
  config?: Readonly<IOidcAuthenticatorConfig>,
) {
  return (request: superagent.SuperAgentRequest): superagent.Request => {
    if (canApplyAuthenticator(request)) {
      // setup retries
      if (config && config.retryUnauthenticatedRequests !== false) {
        // eslint-disable-next-line no-underscore-dangle
        const maxRetries = (request as any)._maxRetries;
        // eslint-disable-next-line no-underscore-dangle
        const retryCallback = (request as any)._retryCallback;
        request.retry(maxRetries || 1, canRetryRequest(retryCallback));
      }
      // override end
      hookMethod(request, 'end', async args => {
        const [callback] = args.methodArgs;
        await onEnd(request, callback);
      });
      // override callback
      hookMethod(request, 'callback', async args => {
        const [, /* previous arg is err */ res] = args.methodArgs;
        await onCallback(request, res);
      });
    }
    return request;
  };

  function canApplyAuthenticator(
    request: superagent.SuperAgentRequest,
  ): boolean {
    if (request.get('Authorization')) {
      return false;
    }
    if (config && config.onAcceptRequest && !config.onAcceptRequest(request)) {
      return false;
    }
    if (config && config.urlFilter && !config.urlFilter.test(request.url)) {
      return false;
    }
    return true;
  }

  async function onEnd(request: superagent.SuperAgentRequest, callback: any) {
    try {
      await injectTokenInHeaders(request);
    } catch (err) {
      session.logger.error(
        {
          error: err,
          method: request.method,
          url: request.url,
        },
        `Could not inject valid access token into request headers of ${request.method} ${request.url}`,
      );
      // if there is any error, we must invoke the callback
      // to let the wrapped promise being rejected
      callback(err);
      throw err;
    }
  }

  async function onCallback(request: superagent.SuperAgentRequest, res: any) {
    const token = tokenProperty.get(request);
    if (
      res &&
      res.status === 401 &&
      token &&
      token.toAuthorizationString() === request.get('Authorization')
    ) {
      try {
        // ensure that we don't use the token any more since the request returned a 401
        await session.deleteToken(token);
      } catch (e) {
        session.logger.error(
          {
            error: e,
            method: request.method,
            url: request.url,
          },
          'Could not delete bad token from session',
        );
      }
      if (config && config.retryUnauthenticatedRequests !== false) {
        try {
          // generate a new token now that we have deleted the previous one
          await injectTokenInHeaders(request);
        } catch (e) {
          session.logger.error(
            {
              error: e,
              method: request.method,
              url: request.url,
            },
            'Could not obtain a new access token before retrying the request',
          );
        }
      }
    }
  }

  async function injectTokenInHeaders(
    request: superagent.SuperAgentRequest,
  ): Promise<TokenSet> {
    const token = await session.getToken();
    request.set('Authorization', token.toAuthorizationString());
    tokenProperty.set(request, token);
    if (config && config.beforeSendRequest) {
      await config.beforeSendRequest(request, token);
    }
    return token;
  }

  function canRetryRequest(
    originalCallback: (
      err: any,
      res: superagent.Response,
    ) => boolean | undefined,
  ) {
    return (err: any, res: superagent.Response): boolean | undefined => {
      if (res && res.status === 401) {
        return true;
      }
      if (originalCallback) {
        return originalCallback(err, res);
      }
      return undefined;
    };
  }
}
