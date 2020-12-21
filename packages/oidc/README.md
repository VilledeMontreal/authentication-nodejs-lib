# Description

This library implements all the OpenID Connect (OIDC) services that will be leveraged by the http client bindings (plugins).

It will also offer an internal alternative to the client bindings with the OidcHttpClient, which is our http client (DefaultHttpClient) with automatic authentication (token injection using an IOidcSession).

See also [Documentation](../../doc/README.md).

See also [Internal example](../../examples/client-internal) demonstrating the use of OidcHttpClient, and the other [examples](../../examples) for the http client bindings.
