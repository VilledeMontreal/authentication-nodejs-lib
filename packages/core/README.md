# Description

This librairy implements core services used by the other oidc and client-bindings libraries.

It provides a simple abstraction over HTTP requests with the IHttpClient interface and our internal implementation (the DefaulthttpClient).
But each HTTP client binding provides its own implementation of the IHttpClient using the native client.

There is also a simple abstraction for logging which allows the consumer of the library to easily plug his own logger.

See also [Documentation](../../doc/README.md).

And also [Examples](../../examples/README.md).
