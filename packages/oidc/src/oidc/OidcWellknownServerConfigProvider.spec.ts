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
import { OidcWellknownServerConfigProvider } from './OidcWellknownServerConfigProvider';

describe('OidcWellknownServerConfigProvider', () => {
  function setup() {
    const logger = new FakeLogger();
    const httpClient = new FakeHttpClient();
    httpClient.register({
      accepts: req => req.url.indexOf('.well-known') > 0,
      returns: req => ({
        body: {
          issuer: 'https://auth.zorg.ca',
          jwks_uri: 'https://auth.zorg.ca/jwks',
          token_endpoint: 'https://auth.zorg.ca/token',
          userinfo_endpoint: 'https://auth.zorg.ca/userinfo',
        },
        statusCode: 200,
      }),
    });
    const timeProvider = new FakeTimeProvider(
      new Date('2019-12-26T17:23:44-05:00'),
    );
    const provider = new OidcWellknownServerConfigProvider(
      logger,
      httpClient,
      timeProvider,
    );
    return {
      httpClient,
      logger,
      provider,
      timeProvider,
    };
  }

  test('getConfig', async () => {
    // setup
    const { provider, timeProvider } = setup();

    // act
    const config = await provider.getConfig('https://auth.zorg.ca');

    // expect
    expect(config).toBeDefined();
    expect(config.issuer).toBe('https://auth.zorg.ca');
    expect(config.token_endpoint).toBe('https://auth.zorg.ca/token');
    expect(config.userinfo_endpoint).toBe('https://auth.zorg.ca/userinfo');
    expect(config.jwks_uri).toBe('https://auth.zorg.ca/jwks');

    // verify we receive cached config
    const config2 = await provider.getConfig('https://auth.zorg.ca');
    expect(config2).toBe(config);

    // verify that cache is invalidated after one hour
    timeProvider.offsetBy(60 * 60 + 100);
    const config3 = await provider.getConfig('https://auth.zorg.ca');
    expect(config3).not.toBe(config);
    expect(config3).toEqual(config);
  });

  test('getConfig with .well-known', async () => {
    // setup
    const { provider } = setup();

    // act
    const config = await provider.getConfig(
      'https://auth.zorg.ca/.well-known/openid-configuration',
    );

    // expect
    expect(config).toBeDefined();
    expect(config.issuer).toBe('https://auth.zorg.ca');
    expect(config.token_endpoint).toBe('https://auth.zorg.ca/token');
    expect(config.userinfo_endpoint).toBe('https://auth.zorg.ca/userinfo');
    expect(config.jwks_uri).toBe('https://auth.zorg.ca/jwks');
  });

  test('getConfig error', () => {
    // setup
    const { provider } = setup();

    // act
    const config = provider.getConfig('');

    // expect
    return expect(config).rejects.toThrowError(
      'server is a required parameter',
    );
  });
});
