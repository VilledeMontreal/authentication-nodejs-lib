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
import { Request, Response } from 'request';
import { TypedProperty } from '@villedemontreal/auth-core';
import { makeRequestPlugin } from './makeRequestPlugin';
import { getRequestInfo } from './requestUtils';

const enabledProperty = new TypedProperty<boolean, Request>(
  Symbol('hasAuthenticator'),
);
const tokenProperty = new TypedProperty<TokenSet, Request>(Symbol('token'));

/**
 *
 * @param session the OIDC session used to provide the access tokens
 * @param [authenticatorConfig] the config for customizing this authenticator
 */
export function authenticator(
  session: IOidcSession,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
) {
  return makeRequestPlugin({
    //--------------------------------------------------------------------
    retries:
      authenticatorConfig?.retryUnauthenticatedRequests !== false ? 1 : 0,
    //--------------------------------------------------------------------
    async onStart(req: Request): Promise<void> {
      if (canApplyAuthenticator(req, authenticatorConfig)) {
        enabledProperty.set(req, true);
        try {
          await injectTokenInHeaders(req, session, authenticatorConfig);
        } catch (err) {
          const { method, url } = getRequestInfo(req);
          session.logger.error(
            {
              error: err,
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
    async onComplete(req: Request, res: Response): Promise<void> {
      const token = tokenProperty.get(req);
      if (
        res &&
        res.statusCode === 401 &&
        token &&
        token.toAuthorizationString() ===
          (req.headers.Authorization || req.headers.authorization)
      ) {
        try {
          // ensure that we don't use the token any more since the request returned a 401
          await session.deleteToken(token);
          tokenProperty.clear(req);
        } catch (e) {
          const { method, url } = getRequestInfo(req);
          session.logger.error(
            {
              error: e,
              method,
              url,
            },
            'Could not delete bad token from session',
          );
        }
      }
    },
  });
}

export function canApplyAuthenticator(
  req: Request,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
): boolean {
  if (enabledProperty.get(req) === true) {
    // if we already allowed the authenticator, it means that we are retrying and thus
    // that can apply the authenticator since we already did it once.
    return true;
  }
  if (req.headers.Authorization || req.headers.authorization) {
    return false;
  }
  if (authenticatorConfig && authenticatorConfig.onAcceptRequest) {
    if (!authenticatorConfig.onAcceptRequest(req)) {
      return false;
    }
  }
  if (authenticatorConfig && authenticatorConfig.urlFilter) {
    const { url } = getRequestInfo(req);
    if (!authenticatorConfig.urlFilter.test(url)) {
      return false;
    }
  }
  return true;
}

async function injectTokenInHeaders(
  req: Request,
  session: IOidcSession,
  authenticatorConfig?: Readonly<IOidcAuthenticatorConfig>,
): Promise<TokenSet> {
  const token = await session.getToken();
  req.setHeader('authorization', token.toAuthorizationString());
  tokenProperty.set(req, token);
  if (authenticatorConfig && authenticatorConfig.beforeSendRequest) {
    try {
      await authenticatorConfig.beforeSendRequest(req, token);
    } catch (err) {
      err.req = req;
      throw err;
    }
  }
  return token;
}
