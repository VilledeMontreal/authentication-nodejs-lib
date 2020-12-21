/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

export interface IOidcTokenInfo {
  /**
   *  REQUIRED.  Boolean indicator of whether or not the presented token
   *  is currently active.  The specifics of a token's "active" state
   *  will vary depending on the implementation of the authorization
   *  server and the information it keeps about its tokens, but a "true"
   *  value return for the "active" property will generally indicate
   *  that a given token has been issued by this authorization server,
   *  has not been revoked by the resource owner, and is within its
   *  given time window of validity (e.g., after its issuance time and
   *  before its expiration time).  See Section 4 for information on
   *  implementation of such checks.
   */
  active: boolean;
  /**
   *  OPTIONAL.  A JSON string containing a space-separated list of
   *  scopes associated with this token, in the format described in
   *  Section 3.3 of OAuth 2.0 [RFC6749].
   */
  scope?: string;
  /**
   *  OPTIONAL.  Client identifier for the OAuth 2.0 client that
   *  requested this token.
   */
  client_id?: string;
  /**
   *  OPTIONAL.  Human-readable identifier for the resource owner who
   *  authorized this token.
   */
  username?: string;
  /**
   *  OPTIONAL.  Type of the token as defined in Section 5.1 of OAuth
   *  2.0 [RFC6749].
   */
  token_type?: string;
  /**
   *  OPTIONAL.  Integer timestamp, measured in the number of seconds
   *  since January 1 1970 UTC, indicating when this token will expire,
   *  as defined in JWT [RFC7519].
   */
  exp?: number;
  /**
   *  OPTIONAL.  Integer timestamp, measured in the number of seconds
   *  since January 1 1970 UTC, indicating when this token was
   *  originally issued, as defined in JWT [RFC7519].
   */
  iat?: number;
  /**
   * OPTIONAL.  Integer timestamp, measured in the number of seconds
   *  since January 1 1970 UTC, indicating when this token is not to be
   *  used before, as defined in JWT [RFC7519].
   */
  nbf?: number;
}
