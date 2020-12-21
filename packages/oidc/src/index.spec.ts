/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { createInspector, createSession } from './index';
import * as oidc from './index';
import { IOidcClientConfig } from './oidc/IOidcClientConfig';
import { OidcTokenInspector } from './oidc/OidcTokenInspector';

describe('index', () => {
  test('core should be defined ', () => {
    expect(oidc).toBeDefined();
    // going through each exported element will satisfy code coverage
    for (const key of Object.keys(oidc)) {
      expect((oidc as any)[key]).toBeDefined();
    }
  });

  test('createSession', () => {
    // setup
    const clientConfig: IOidcClientConfig = {
      authMethod: 'client_secret_basic',
      client: {
        id: 'id',
        secret: 'secret',
      },
      issuer: 'https://auth.zorg.ca',
    };
    // act
    const session = createSession(clientConfig);
    // expect
    expect(session).toBeDefined();
    // test inspector
    const inspector = createInspector(session, {
      introspectionEndpointAuthMethod: 'bearer_token',
    });
    expect(inspector).toBeInstanceOf(OidcTokenInspector);
  });
});
