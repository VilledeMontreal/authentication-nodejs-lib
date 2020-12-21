/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { DefaultHttpClient, NoopLogger } from '@villemontreal/auth-core';
import { IOidcClientConfig, IOidcSessionConfig } from '.';
import { createSession } from './createSession';
import { SuperagentHttpClient } from './SuperagentHttpClient';

describe('createSession', () => {
  test('createSession without options', () => {
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'foo',
        secret: 'bar',
      },
      issuer: 'http://localhost:3000',
      scopes: ['openid', 'profile'],
    };
    const session = createSession(clientConfig) as any;
    expect(session).toBeDefined();
    expect(session.httpClient).toBeInstanceOf(SuperagentHttpClient);
  });

  test('createSession with custom http client', () => {
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'foo',
        secret: 'bar',
      },
      issuer: 'http://localhost:3000',
      scopes: ['openid', 'profile'],
    };
    const httpClient = new DefaultHttpClient(new NoopLogger());
    const sessionConfig: IOidcSessionConfig = {
      factory: {
        createHttpClient: pLogger => httpClient,
      },
    };
    const session = createSession(clientConfig, sessionConfig) as any;
    expect(session).toBeDefined();
    expect(session.sessionConfig).toBe(sessionConfig);
    expect(session.httpClient).toBe(httpClient);
  });
});
