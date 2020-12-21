/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/* eslint-disable import/no-cycle */

import { IOidcClientConfig } from './oidc/IOidcClientConfig';
import { IOidcSession } from './oidc/IOidcSession';
import { IOidcSessionConfig } from './oidc/IOidcSessionConfig';
import { IOidcTokenInspector } from './oidc/IOidcTokenInspector';
import { OidcSessionBuilder } from './oidc/OidcSessionBuilder';
import {
  OidcTokenInspector,
  IOidcTokenInspectorConfig,
} from './oidc/OidcTokenInspector';

export { IClaims } from './tokens/IClaims';
export { IClaimsProvider } from './tokens/IClaimsProvider';
export { ITokenProvider } from './tokens/ITokenProvider';
export { ITokenStore } from './tokens/ITokenStore';
export { injectHttpClient } from './oidc/injectHttpClient';
export { IOidcAuthenticatorConfig } from './oidc/IOidcAuthenticatorConfig';
export { IOidcClientConfig } from './oidc/IOidcClientConfig';
export { IOidcSession } from './oidc/IOidcSession';
export { IOidcSessionConfig } from './oidc/IOidcSessionConfig';
export { IOidcServerConfig } from './oidc/IOidcServerConfig';
export { IOidcServerConfigGetter } from './oidc/IOidcServerConfigGetter';
export { IOidcServerConfigProvider } from './oidc/IOidcServerConfigProvider';
export { IOidcTokenInspector } from './oidc/IOidcTokenInspector';
export { OidcHttpClient } from './oidc/OidcHttpClient';
export { OidcSession } from './oidc/OidcSession';
export { OidcSessionBuilder } from './oidc/OidcSessionBuilder';
export { OidcSessionState } from './oidc/OidcSessionState';
export { OidcServerConfigGetter } from './oidc/OidcServerConfigGetter';
export { OidcTokenProvider } from './oidc/OidcTokenProvider';
export { OidcTokenInspector } from './oidc/OidcTokenInspector';
export { OidcUserInfoClaimsProvider } from './oidc/OidcUserInfoClaimsProvider';
export { OidcWellknownServerConfigProvider } from './oidc/OidcWellknownServerConfigProvider';
export { TokenSet } from './tokens/TokenSet';
export { InMemoryTokenStore } from './tokens/InMemoryTokenStore';
export { FakeClaimsProvider } from './tokens/FakeClaimsProvider';
export { FakeTokenProvider } from './tokens/FakeTokenProvider';

/**
 * creates a new OIDC session using a IHttpClient implemented by the DefaultHttpClient
 * @param clientConfig the config for the OIDC client
 * @param sessionConfig the config for the OIDC session
 * @returns IOidcSession
 */
export function createSession(
  clientConfig: IOidcClientConfig,
  sessionConfig?: IOidcSessionConfig,
): IOidcSession {
  const builder = new OidcSessionBuilder();
  return builder.buildSession(clientConfig, sessionConfig);
}

/**
 * creates a new OIDC inspector used to introspect access tokens
 * @param session the OIDC session used by the inspector
 * @param config the config used to customize the inspector
 */
export function createInspector(
  session: IOidcSession,
  config: IOidcTokenInspectorConfig,
): IOidcTokenInspector {
  return new OidcTokenInspector(session, config);
}
