# Description

This is the HTTP client binding for the [Request](https://github.com/request/request) library.

It provides an implementation of IHttpClient, to use Request for all OIDC internal calls, and it provides
additional plugins which enable authentication, logging and correlation ID injection.

Note that 'request' has been deprecated but some projects still require it such as the
https://openapi-generator.tech/docs/generators/typescript-node code generator.

Note that this plugin won't implement all features of the OIDC lib because of the limitations of the
'request' module (no retry) and its deprecated state.

## Plugins

- [authenticator](src/authenticator.ts)
- [requestLogger](src/requestLogger.ts)
- [correlationId](src/correlationId.ts)

# Usage

```
npm install uuid request @villemontrea/auth-oidc-plugin-request
npm install @types/request --save-dev
```

```typescript
import * as request from 'request';
import { v4 as uuidv4 } from 'uuid';
import { HttpRequestCorrelator } from '@villemontreal/auth-core';
import {
  authenticator,
  createSession,
  requestLogger,
  requestCorrelator,
} from '@villemontreal/auth-oidc-plugin-request';
// configure
const correlator = new HttpRequestCorrelator(() => uuidv4());
const session = createSession(
  {
    authMethod: 'client_secret_basic',
    client: {
      id: 'client',
      secret: 'clientSecret',
    },
    issuer: 'http://localhost:5000',
    scopes: ['openid', 'profile'],
  },
  {
    factory: {
      createLogger: () => new ConsoleLogger(() => correlator.getId()),
    },
    httpDefaults: {
      correlator,
    },
  },
);
// custom auth for each http call:
const config: request.CoreOptions = {
  baseUrl: 'http://localhost:4004',
};
authenticator(session).bind(config);
requestLogger(session.logger).bind(config);
requestCorrelator(correlator).bind(config);
request.get('/secured/profile', config, (err, res, body) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.statusCode, body);
  }
});
```

There are a couple of helper functions that make it easy to add OIDC authentication into the API classes
generated by this project https://openapi-generator.tech/docs/generators/typescript-node:

```typescript
import {
  ILogger,
  IHttpRequestCorrelator,
} from '@villemontreal/auth-core';
import {
  IOidcSession,
  authInterceptor,
  requestCorrelationInterceptor,
  requestLoggingInterceptor
} from '@villemontreal/auth-oidc-plugin-request';
import { OrderApi } from 'OrderApi';

export function createOrderApi(
  baseUrl: string,
  session: IOidcSession,
  logger: ILogger,
  correlator: IHttpRequestCorrelator,
) {
  const orderApi = new OrderApi(baseUrl);
  orderApi.addInterceptor(authInterceptor(session));
  orderApi.addInterceptor(requestLoggingInterceptor(logger));
  orderApi.addInterceptor(requestCorrelationInterceptor(correlationIdService));
  return orderApi;
}

const orderApi = createOrderApi(...);
const res = await orderApi.getOrderById('abc123');

```

# Documentation

See [Documentation](../../doc/README.md).

# Examples

See [Request client](../../examples/client-request)