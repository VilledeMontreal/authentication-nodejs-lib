# Table of contents
- [Concepts](#concepts)
- [Extensibility](#extensibility)
  * [Logging](#logging)
  * [Request correlations](#request-correlations)
    + [Example with the internal HTTP client:](#example-with-the-internal-http-client)
    + [Example with Superagent:](#example-with-superagent)
  * [Claims provider](#claims-provider)
- [Configuration](#configuration)
  * [IOidcClientConfig](#ioidcclientconfig)
  * [IOidcSessionConfig](#ioidcsessionconfig)
  * [IOidcAuthenticatorConfig](#ioidcauthenticatorconfig)
  * [IHttpDefaults](#ihttpdefaults)
  * [IOidcFactory](#ioidcfactory)
- [Flows](#flows)
  * [Request or renew a token](#request-or-renew-a-token)
  * [Use an existing token](#use-an-existing-token)
  * [Retry a failed request](#retry-a-failed-request)
- [Object model](#object-model)
  * [High level relationships](#high-level-relationships)
  * [Session states](#session-states)
  * [Http client](#http-client)
- [Introspection](#introspection)
- [Unit testing](#unit-testing)

# Concepts

This library provides a session that will handle the authentication to an OpenID Connect server in order to provide the access tokens required to access secured APIs.

The authentication requires a valid client configuration ([IOidcClientConfig](#markdown-header-ioidcclientconfig))) that will specify the client ID and secret, the auth method, the scopes and the optional service account (username and password).

The session will renew the access token before it expires, either each time you access it or eagerly, using a timer, when you enable the scheduleRefresh option of the [IOidcSessionConfig](#markdown-header-ioidcsessionconfig) (true by default).

Once you have a session, you can either use it yourself, for instance:

```typescript
// get the current token
const token = await session.getToken();
// inject the token in the request header
req.headers.authorization = token.toAuthorizationHeader(); // expands to: Bearer token1234
try {
  // send your request with your own http client
  const res = await send(req);
  // do something with the response...
} catch (err) {
  // intercept unauthorized error
  if (err.statusCode === 401) {
    // forget the bad token
    await session.deleteToken(token);
  }
  throw err;
}
```

Or better, you can use our authenticator plugin dedicated to your http client library of choice. For the moment we support the most popular ones only.

Example using Superagent:

```typescript
import * as superagent from 'superagent';
import {
  authenticator,
  createSession,
} from '@villemontreal/auth-oidc-plugin-superagent';
// configure
const session = createSession({
  authMethod: 'client_secret_basic',
  client: {
    id: 'client',
    secret: 'clientSecret',
  },
  issuer: 'http://localhost:5000',
  scopes: ['openid', 'profile'],
});
// custom auth for each http call:
const res = await superagent
  .get('http://localhost:4004/secured/profile')
  .use(authenticator(session));
console.log(res.status, res.body);
```

The authenticator can also intercept a bad request (with a 401 status code),
delete the bad token and retry the failed request with a fresh token,
when the retryUnauthenticatedRequests option of the [IOidcAuthenticatorConfig](#markdown-header-ioidcauthenticatorconfig) is true (it is enabled by default).

See also the [Retry a failed request](#markdown-header-retry-a-failed-request) flow below to better understand it.

Finally, you can either specify the authenticator plugin every time you make a http client call (previous example),
or you can create a dedicated http agent preconfigured with the authenticator (and eventually other plugins),
to avoid repeating yourself.

Example:

```typescript
import * as superagent from 'superagent';
import {
  authenticator,
  createSession,
} from '@villemontreal/auth-oidc-plugin-superagent';
// configure
const session = createSession({
  authMethod: 'client_secret_basic',
  client: {
    id: 'client',
    secret: 'clientSecret',
  },
  issuer: 'http://localhost:5000',
  scopes: ['openid', 'profile'],
});
// configure auth once for all http calls:
const myAgent = superagent.agent().use(authenticator(session));
// then each call will be automatically authenticated
const res = await myAgent.get('http://localhost:4004/secured/profile');
console.log(res.status, res.body);
```

Note that if you don't want to use an external http client library, you can still benefit from our internal OidcHttpClient which
will provide the same advantage of handling the token management and expose a simple http client.

Example:

```typescript
import { createSession, OidcHttpClient } from '@villemontreal/auth-oidc';
// configure
const session = createSession({
  authMethod: 'client_secret_basic',
  client: {
    id: 'client',
    secret: 'clientSecret',
  },
  issuer: 'http://localhost:5000',
  scopes: ['openid', 'profile'],
});

// create http client
const httpClient = new OidcHttpClient(session.httpClient, session);
// invoke API:
const res = await httpClient.send({
  url: 'http://localhost:4004/secured/profile',
});
console.log(res.statusCode, res.body);
```

See [Example client-internal](../examples/client-internal) for a real use.

# Extensibility

This library relies on the factory design pattern for instantiating all the objects required by a session.

But instead of requiring you to subclass a factory class, you can simply provide a factory function for the objects you intend to override,
using the "factory" property of the [IOidcSessionConfig](#markdown-header-ioidcsessionconfig).

The createSession function will use the [OidcSessionBuilder](../packages/oidc/src/oidc/OidcSessionBuilder.ts) class in order to instantiate and connect all the objects that belong to a session.

The builder will implement the [IOidcFactory](#markdown-header-ioidcfactory) with default classes, unless you override them.

So, you can provide your own logger, your own token store, your own token provider, your own claims provider...

Example:

```typescript
import { ConsoleLogger } from '@villemontreal/auth-core';
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createTokenStore: (logger) => new MyCustomTokenStore(logger),
  },
};
const session = createSession(clientConfig, sessionConfig);
```

## Logging

By default, the factory will create an empty logger ([NoopLogger](../packages/core/src/logging/NoopLogger.ts)) which will simply ignore the log events.

If you want, to see the log in the console, for debugging, you can simply override the logger fatory method and
return an instance of the [ConsoleLogger](../packages/core/src/logging/ConsoleLogger.ts).

Example:

```typescript
import { ConsoleLogger } from '@villemontreal/auth-core';
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createLogger: () => new ConsoleLogger(),
  },
};
const session = createSession(clientConfig, sessionConfig);
```

Of course, you should use your own logging library instead for a consistant logging experience.

Also, the default HTTP client will log the execution of the requests by default (including the elapsed time), but you can disable this behaviour using the IHttpDefaults:

```typescript
import { ConsoleLogger } from '@villemontreal/auth-core';
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createLogger: () => new ConsoleLogger(),
  },
  httpDefaults: {
    logRequests: false,
  },
};
const session = createSession(clientConfig, sessionConfig);
```

But if you want your custom HTTP client (such as Superagent) to log the requests, then you need to use the requestLogger plugin:

```typescript
const req = superagent
  .get('http://localhost:4004/secured/profile')
  .use(requestLogger(session.logger))
  .use(authenticator(session, authenticatorConfig));
const res = await req;
console.log('Response', res.status, res.body);
```

## Request correlations

In addition to logging, you might consider tagging the HTTP requests with a shared correlation ID that will help
group the log events that belong to the same transaction.

Your logger might already transparently find the current correlation ID and display it, but we need to tag the
outgoind HTTP requests with the proper correlation header.

To do that, the DefaultHttpClient class will need to receive the current correlation ID.

You can provide a IHttpRequestCorrelator instance to the IHttpDefaults config used by the IOidcHttpSession and IHttpClient.

We provide a default implementation with the HttpRequestCorrelator class, which relies on the brand new AsyncLocalStorage class
of the async_hooks module, only available starting from NodeJS 13.10 and later.

For an older version of NodeJS, you will have to implement it yourself, using the cls-hooked npm module for instance.

The examples are already setup to use the default correlator.

### Example with the internal HTTP client:

```typescript
import { ConsoleLogger, HttpRequestCorrelator } from '@villemontreal/auth-core';
const correlator = new HttpRequestCorrelator();
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createLogger: () => new ConsoleLogger(() => correlator.getId()),
  },
  httpDefaults: {
    correlator,
  },
};
const session = createSession(clientConfig, sessionConfig);
// create http client
const httpClient = new OidcHttpClient(session.httpClient, session);
// invoke API:
const res = await httpClient.send({
  url: 'http://localhost:4004/secured/profile',
});
console.log(res.statusCode, res.body);
```

### Example with Superagent:

Note that in this case you must share the correlator with the IHttpDefaults and with the
requestCorrelator plugin.

```typescript
import { ConsoleLogger, HttpRequestCorrelator } from '@villemontreal/auth-core';
const correlator = new HttpRequestCorrelator();
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createLogger: () => new ConsoleLogger(() => correlator.getId()),
  },
  httpDefaults: {
    correlator,
  },
};
const session = createSession(clientConfig, sessionConfig);
// invoke API:
const req = superagent
  .get('http://localhost:4004/secured/profile')
  .use(requestLogger(session.logger))
  .use(requestCorrelator(correlator))
  .use(authenticator(session));
const res = await req;
console.log('Response', res.status, res.body);
```

## Claims provider

The token provider will create instances of the [TokenSet](../packages/oidc/src/tokens/TokenSet.ts) class, when producing access tokens.

This [TokenSet](../packages/oidc/src/tokens/TokenSet.ts) has a lazy property named "claims" which will invoke the attached IClaimsProvider in order to fetch additional claims.

By default, the [OidcTokenProvider](../packages/oidc/src/oidc/OidcTokenProvider.ts) will invoke the userinfo endpoint of the OIDC server, but you can fetch your own claims in a separate system.

Example:

```typescript
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createClaimsProvider: (logger, httpClient, serverConfigGetter) => ({
      getClaims: async (accessToken: string) => {
        const res = await httpClient.send({url: 'https://my.claims.provider.com/claims/' + accessToken});
        return res.body;
      }
    })),
  },
};
```

# Configuration

The session and the authenticator can be further configured with their own config objects (IOidcSessionConfig and IOidcAuthenticatorConfig).

## IOidcClientConfig

See also the [IOidcClientConfig](../packages/oidc/src/oidc/IOidcClientConfig.ts) interface.

| Property       | Description                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| issuer         | Either a string containing the url of your OIDC server in order to fetch the discovery document,<br>or an IOidcServerConfig if you need a custom configuration. |
| client         | The client ID and secret used to request a new token.                                                                                                           |
| user           | Optional. The service account used to request a new token with the password grant.                                                                              |
| grantType      | Optional. If not specified, it will be guessed based on the provided options.<br>Allowed values: client_credentials, password or refresh_token                  |
| authMethod     | The method used to provide the client secret: client_secret_basic or client_secret_post                                                                         |
| scopes         | Optional. A list of scopes, as an array of string or<br> as a single string containing a list of scopes separated by a space.                                   |
| requestTimeout | Optional. Overrides the global request timeout defined in IHttpDefaults only for OIDC endpoints                                                                 |

Note that if you don't provide a grantType, the library will use the password grant if there is both a client and a user, otherwise it will fallback to the client_credentials grant. If you need the refresh_token grant, then you must be explicit.

For the issuer, you should simply provide the FQDN of your OIDC server, such as https://auth.my-domain.com,
and the [OidcWellknownServerConfigProvider](../packages/oidc/src/oidc/OidcWellknownServerConfigProvider.ts) will try to
fetch the discovery document by appending '.well-known/openid-configuration', like: https://auth.my-domain.com/.well-known/openid-configuration

However, if you need to customize the discovery content, you can provide your own definition, such as:

```typescript
const clientConfig: IOidcClientConfig = {
  authMethod: 'client_secret_basic',
  client: {
    id: 'id',
    secret: 'secret',
  },
  issuer: {
    authorization_endpoint: 'authorization_endpoint',
    clientinfo_endpoint: 'clientinfo_endpoint',
    issuer: 'issuer',
    jwks_uri: 'jwks_uri',
    token_endpoint: 'token_endpoint',
    userinfo_endpoint: 'userinfo_endpoint',
  },
  scopes: ['openid', 'profile'],
};
```

## IOidcSessionConfig

See also the [IOidcSessionConfig](../packages/oidc/src/oidc/IOidcSessionConfig.ts) interface.

| Property            | Description                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| canUseRefreshTokens | Optional. Defaults to false. Allows the use of refresh tokens to renew a token (when they are returned by the token endpoint).<br>If false, it will always request a new token. |
| scheduleRefresh     | Optional. Defaults to false. When true, it will use a timer to eagerly refresh the current token. But you must use the token at least once or the scheduling will be suspended. |
| factory             | Optional. Allows you to override the creation of the objects with your own implementation.                                                                                      |
| httpDefaults        | Optional. Allows you to specify default values for the http requests submitted to the http client.                                                                              |

## IOidcAuthenticatorConfig

See also the [IOidcAuthenticatorConfig](../packages/oidc/src/oidc/IOidcAuthenticatorConfig.ts) interface.

| Property                     | Description                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| retryUnauthenticatedRequests | Optional. Defaults to true. Specifies if the authenticator should force a token refresh and<br> retry the http request if it received a 401 status code.<br>Note that it will be retried only once. |
| urlFilter                    | Custom filter that will only authenticate the requests matching the regex.                                                                                                                          |
| onAcceptRequest              | Callback used to filter out requests that don't need to be authenticated.                                                                                                                           |

## IHttpDefaults

See also the [IHttpDefaults](../packages/core/src/http/IHttpDefaults.ts) interface.

| Property              | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| headers               | Optional. Allows you to set default headers for all requests.                                                            |
| timeout               | Optional. Allows you to set a default timeout for all requests.                                                          |
| retries               | Optional. Allows you to set a default number of retries for all requests.                                                |
| logRequests           | Optional. Defaults to true. Logs information about the execution of the HTTP requests.                                   |
| correlationIdProvider | Optional. Allows to automatically inject a correlation ID in the standard "x-correlation-id" header of the HTTP requests |

## IOidcFactory

See also the [IOidcFactory](../packages/oidc/src/oidc/IOidcFactory.ts) interface.

| Property                   | Description                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| createClaimsProvider       | Claims provider for TokenSet claims.<br>By default, it will invoke the userinfo endpoint |
| createHttpClient           | Http Client                                                                              |
| createLogger               | Logger                                                                                   |
| createServerConfigProvider | OIDC Server config provider (will fetch the discovery document)                          |
| createSession              | OIDC session                                                                             |
| createTimeProvider         | get 'Now'                                                                                |
| createTokenProvider        | OIDC token provider                                                                      |
| createTokenStore           | Token store                                                                              |

# Flows

## Request or renew a token

This flow describes all the interactions required to authenticate a HTTP request handled by a HTTP client, using a plugin.

This will happen for the first interaction, when there is no access token, or it will happen regularly every time the token is about to expire.

Note that the "scheduleRefresh" option of the [IOidcSessionConfig](#markdown-header-ioidcsessionconfig) allows you to initiate a token refresh eagerly, to avoid blocking
a request needing an access token. This option is true by default.

![](/doc/images/authenticator-request-token.svg)

## Use an existing token

This flow describes the interactions required to authenticate a HTTP request handled by a HTTP client, when an valid access token is already available.

![](/doc/images/authenticator-existing-token.svg)

## Retry a failed request

This flow is similar to both previous flows. Indeed, it tries to authenticate the request with a token that hasn't expired yet,
but the token is invalid (revoked or missing).

In this case, the HTTP client can flush the token store and retry authenticating the request in order to get a brand new access token.

Note that this will will happen only when the option "retryUnauthenticatedRequests" of the [IOidcAuthenticatorConfig](#markdown-header-ioidcauthenticatorconfig) is true, which is the case by default.

![](/doc/images/authenticator-retry-request.svg)

# Object model

## High level relationships

![](/doc/images/relationships.svg)

## Session states

![](/doc/images/session-states.svg)

## Http client

![](/doc/images/http-client.svg)

# Introspection

If you need to validate an existing access token, find information about the OIDC client used to issue the token or to get claims about the user, then you can leverage the [OidcTokenInspector](../packages/oidc/src/oidc/OidcTokenInspector.ts) class.

To build such an inspector, import the createInspector function and provide a valid OIDC session:

```typescript
import { createInspector, createSession } from '@villemontreal/auth-oidc';
const session = createSession(clientConfig, sessionConfig);
const inspector = createInspector(session, {
  introspectionEndpointAuthMethod: 'client_secret_basic',
});
const tokenInfo = await inspector.getTokenInfo(access_token);
```

See this [example](../examples/server-api/src/index.ts) for a concrete use.

# Unit testing

If you need to mock your session and avoid requesting real access tokens during unit tests,
you can simply use the FakeTokenProvider class, when overriding the createTokenProvider factory
method.
This fake can also receive a custom IClaimsProvider which could be served by the FakeClaimsProvider,
if your code needs to access the claims of the current access token.

Example:

```typescript
import { FakeLogger, FakeTimeProvider } from '@villemontreal/auth-core';
import {
  FakeClaimsprovider,
  FakeTokenProvider,
  IOidcSessionConfig,
} from '@villemontreal/auth-oidc';
// setup
const logger = new FakeLogger();
const timeProvider = new FakeTimeProvider(new Date(2019, 12, 26, 17, 23, 44));
const claimsProvider = new FakeClaimsProvider({
  username: 'serviceAccountXYZ',
});
const tokenProvider = new FakeTokenProvider(timeProvider, claimsProvider);
const sessionConfig: IOidcSessionConfig = {
  factory: {
    createLogger: () => logger,
    createTokenProvider: () => tokenProvider,
  },
};
const session = createSession(clientConfig, sessionConfig);
// act
await invokeCodeRequiringASession(session);
// expect
// Here you can inspect what as been logged in the fake logger
```

Note that you can configure the FakeTokenProvider to allow it to produce tokens, refresh tokens.
You can also configure the expiration delay of the tokens which has been set to a short 300 seconds.

The FakeTimeProvider will ensure that we generate the same dates, which helms asserting the results.

Finally, the generated access tokens will have the following pattern: token1, token2, token3....

Warning! You can use fake tokens only if you don't really call the target endpoints otherwise your requests will have an invalid token and will be rejected with a 401. So, you should also mock those target calls.

Note that you could also provide your own fake implementation of IOidcSession, but it might require a little more work
than necessary.
