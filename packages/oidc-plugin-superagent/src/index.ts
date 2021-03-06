/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

export { authenticator } from './authenticator';
export { requestLogger } from './requestLogger';
export { requestCorrelator } from './requestCorrelator';
export { createSession } from './createSession';
export {
  IOidcAuthenticatorConfig,
  IOidcClientConfig,
  IOidcSessionConfig,
  IOidcSession,
  TokenSet,
  IClaims,
} from '@villedemontreal/auth-oidc';
