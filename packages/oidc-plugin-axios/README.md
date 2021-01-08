# Description

This is the HTTP client binding for the [Axios](https://github.com/axios/axios) library.

It provides an implementation of IHttpClient, to use Axios for all OIDC internal calls, and it provides
additional plugins which enable authentication, logging and correlation ID injection.

This library belongs to a monorepo. Please visit https://github.com/VilledeMontreal/authentication-nodejs-lib
for more information.

## Plugins

- [authenticator](src/authenticator.ts)
- [requestLogger](src/requestLogger.ts)
- [correlationId](src/correlationId.ts)

# Usage

```
npm install axios @villemontrea/auth-oidc-plugin-axios
npm install @types/axios --save-dev
```

```typescript
import axios, { AxiosRequestConfig } from 'axios';
import {
  authenticator,
  createSession,
} from '@villedemontreal/auth-oidc-plugin-axios';
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
const config: AxiosRequestConfig = {};
authenticator(session).bind(config);
const res = await axios.get('http://localhost:4004/secured/profile', config);
console.log(res.status, res.data);

// or configure auth once for all http calls:
const myAgent = axios.create();
authenticator(session).bind(myAgent);
// then each call will be automatically authenticated
const res2 = await myAgent.get('http://localhost:4004/secured/profile');
console.log(res2.status, res.data);
```

# Documentation

See [Documentation](https://github.com/VilledeMontreal/authentication-nodejs-lib/tree/master/doc/README.md).

# Examples

See [Axios client](https://github.com/VilledeMontreal/authentication-nodejs-lib/tree/master/examples/client-axios)
