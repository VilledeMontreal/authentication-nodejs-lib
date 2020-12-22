/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  FakeHttpClient,
  FakeLogger,
  FakeTimeProvider,
} from '@villemontreal/auth-core';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcServerConfig } from './IOidcServerConfig';
import { OidcServerConfigGetter } from './OidcServerConfigGetter';
import { OidcUserInfoClaimsProvider } from './OidcUserInfoClaimsProvider';
import { OidcWellknownServerConfigProvider } from './OidcWellknownServerConfigProvider';

interface ISetupOptions {
  useEmptyServerConfig?: boolean;
}

describe('OidcUserInfoClaimsProvider', () => {
  function setup(options: ISetupOptions = {}) {
    const logger = new FakeLogger();
    const timeProvider = new FakeTimeProvider(
      new Date('2019-12-26T17:23:44-05:00'),
    );
    const httpClient = new FakeHttpClient();
    httpClient.register({
      accepts: req => req.url.indexOf('.well-known') > 0,
      returns: req => ({
        body: { userinfo_endpoint: 'https://auth.zorg.ca/userinfo' },
        statusCode: 200,
      }),
    });
    const serverConfigProvider = new OidcWellknownServerConfigProvider(
      logger,
      httpClient,
      timeProvider,
    );
    let issuer;
    if (options.useEmptyServerConfig) {
      const empty: any = {};
      issuer = empty as IOidcServerConfig;
    } else {
      issuer = 'https://auth.zorg.ca';
    }
    const clientConfig: IOidcClientConfig = {
      issuer,
      // tslint:disable-next-line: object-literal-sort-keys
      authMethod: 'client_secret_basic',
      client: {
        id: 'id',
        secret: 'secret',
      },
    };
    const serverConfigGetter = new OidcServerConfigGetter(
      serverConfigProvider,
      clientConfig,
    );
    const provider = new OidcUserInfoClaimsProvider(
      logger,
      httpClient,
      clientConfig,
      serverConfigGetter,
    );
    return {
      clientConfig,
      httpClient,
      logger,
      provider,
      serverConfigProvider,
      timeProvider,
    };
  }

  test('validation error', async () => {
    // setup
    const { provider } = setup({ useEmptyServerConfig: true });
    try {
      // act
      await provider.getClaims('bad token');
      throw new Error('expected token endpoint error');
    } catch (e) {
      // expect
      expect(e.message).toBe('serverConfig.userinfo_endpoint is empty');
    }
  });

  test('fetch failure', async () => {
    // setup
    const { provider, httpClient, logger } = setup();
    const invalidToken = {
      error: 'invalid_token',
      error_description:
        'The access token provided is expired, revoked, malformed, or invalid for other reasons. Try to request a new access token and retry the protected resource.',
    };
    httpClient.register({
      accepts: req => req.url.indexOf('/userinfo?access_token=') > 0,
      returns: req => ({ statusCode: 400, body: invalidToken }),
    });
    try {
      // act
      await provider.getClaims('bad token');
      throw new Error('expected 400 error');
    } catch (e) {
      // expect
      expect(e.code).toBe('EBadHttpResponseStatusCode');
      expect(e.statusCode).toBe(400);
      expect(e.body).toEqual(invalidToken);
      expect(logger.last()).toEqual({
        logType: 'debug',
        messageObj: {
          accessToken: 'bad token',
          endoint: 'https://auth.zorg.ca/userinfo',
        },
        txtMsg: 'fetching claims of token bad token',
      });
    }
  });

  test('fetch success', async () => {
    // setup
    const { provider, httpClient, logger } = setup();
    const fakeClaims = {
      email: 'foo@bar.com',
      email_verified: true,
      userName: 'userName',
    };
    httpClient.register({
      accepts: req => req.url.indexOf('/userinfo?access_token=') > 0,
      returns: req => ({ statusCode: 200, body: fakeClaims }),
    });
    // act
    const claims = await provider.getClaims(
      'e98e2b80-f29f-4de4-a1c8-90c293c2bdbe',
    );
    // expect
    expect(claims).toBeDefined();
    expect(claims).toEqual(fakeClaims);
    expect(logger.last()).toEqual({
      logType: 'debug',
      messageObj: {
        accessToken: 'e98e2b80-f29f-4de4-a1c8-90c293c2bdbe',
        endoint: 'https://auth.zorg.ca/userinfo',
      },
      txtMsg: 'fetching claims of token e98e2b80-f29f-4de4-a1c8-90c293c2bdbe',
    });
  });
});
