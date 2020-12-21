# Description

This is the HTTP client binding for the [Superagent](https://visionmedia.github.io/superagent/) library.

It provides an implementation of IHttpClient, to use Superagent for all OIDC internal calls, and it provides
additional plugins which enable authentication, logging and correlation ID injection.

## Plugins

- [authenticator](src/authenticator.ts)
- [requestLogger](src/requestLogger.ts)
- [correlationId](src/correlationId.ts)

# Usage

```
npm install superagent @villemontrea/auth-oidc-plugin-superagent
```

```typescript
import * as superagent from 'superagent';
import {
  authenticator,
  createSession,
  requestLogger,
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
  .use(requestLogger(session.logger))
  .use(authenticator(session));
console.log(res.status, res.body);
// or configure auth once for all http calls:
const myAgent = superagent.agent().use(authenticator(session));
// then each call will be automatically authenticated
const res2 = await myAgent.get('http://localhost:4004/secured/profile');
console.log(res2.status, res.body);
```

# Documentation

See [Documentation](../../doc/README.md).

# Examples

See [Superagent client](../../examples/client-superagent)
