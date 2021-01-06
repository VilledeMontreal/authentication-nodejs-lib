[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=ncloc)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=duplicated_lines_density)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=coverage)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=security_rating)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=villedemontreal_authentication-nodejs-lib&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=villedemontreal_authentication-nodejs-lib)

# authentication-nodejs-lib

This library handles transparent authentication of backend to backend API calls, using the OpenID Connect protocol.

It has been designed to cooperate with existing popular http client libraries using their own plugin system,
in order to satisfy developers and stay out of their way.

The use of plugins has made the token injection completely transparent, simplifying development
and reducing the risk of mistakes.

## Why another oauth library?

- dedicated to service to service communication, with service accounts or client credentials.
  - note that there are many very good libraries for the frontend or for servers protected by OIDC,
    but not many to properly implement service to service communication.
- no external libraries
  - some libraries rely on a specific http client, which is not the one you chose and would
    unnecessarily increase the number of dependencies in your project.
- use modern javascript and typescript
- easy integration with any modern http client lib
- auto-refresh of tokens
- optional out of band token refresh (scheduled)
- proper cache invalidation of bad tokens (and auto retry)
- proper concurrency handling (renew token once when concurrent requests require it)
- request correlation
- easy, simple and clean API

## Points of interest

- 100% code coverage
- 100% Sonarqube compliant
- abstraction for any http client lib
- immutable objects
- small, composable objects
- no globals, no singleton
- fully async
- factory/builder pattern for easy testing and extensibility
- concurrency handling to avoid refreshing the same token twice
  - see SynchronizedAsyncValue
- auto refresh for expired and invalid access tokens
- scheduled refresh to avoid refreshing a token while serving a request
- easy configuration
- native integration with popular http request libraries (superagent, axios, got...)

## Supported http clients

- [Superagent](https://visionmedia.github.io/superagent/)
- [Axios](https://visionmedia.github.io/axios/)
- [Request](https://github.com/request/request/) (Note that this module has been deprecated but is still used by some projects such as https://openapi-generator.tech/docs/generators/typescript-node)
- [Got](https://visionmedia.github.io/got/) (planned)

## Tested OIDC servers

- [oidc-provider](https://www.npmjs.com/package/oidc-provider)
- [Gluu](https://www.gluu.org/)

## Additional plugins

### Request logger

This plugin will log information before and after the execution of a request, as well as its elapsed time.

- [Superagent plugin](packages/oidc-plugin-superagent/src/requestLogger.ts)
- [Axios plugin](packages/oidc-plugin-axios/src/requestLogger.ts)
- [Request plugin](packages/oidc-plugin-request/src/requestLogger.ts)

### Request correlator

This plugin will inject the x-correlation-id header in the request.
Note that a correlation ID can also be injected in the requests handled by a IHttpClient
when the "correlationIdProvider" property of the IHttpDefaults is defined.

- [Superagent plugin](packages/oidc-plugin-superagent/src/requestCorrelator.ts)
- [Axios plugin](packages/oidc-plugin-axios/src/requestCorrelator.ts)
- [Request plugin](packages/oidc-plugin-request/src/requestCorrelator.ts)

### Request retryer

This plugin will retry a request if it meets some criteria.

- Superagent: this is a builtin feature of the library
- [Axios plugin](packages/oidc-plugin-axios/src/retryRequest.ts)

## Usage

### Superagent

Here's the simplest example, using the [Superagent](https://visionmedia.github.io/superagent/) http client:

```
npm install superagent @villedemontreal/auth-oidc-plugin-superagent
npm install @types/superagent --save-dev
```

```typescript
import * as superagent from 'superagent';
import {
  authenticator,
  createSession,
} from '@villedemontreal/auth-oidc-plugin-superagent';
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

// or configure auth once for all http calls:
const myAgent = superagent.agent().use(authenticator(session));
// then each call will be automatically authenticated
const res2 = await myAgent.get('http://localhost:4004/secured/profile');
console.log(res2.status, res.body);
```

### Axios

Here's the simplest example, using the [Axios](https://visionmedia.github.io/axios/) http client:

```
npm install axios @villedemontreal/auth-oidc-plugin-axios
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

### Request

Here's the simplest example, using the [Request](https://github.com/request/request/) http client:

```
npm install request @villedemontreal/auth-oidc-plugin-request
npm install @types/request --save-dev
```

```typescript
import * as request from 'request';
import {
  authenticator,
  createSession,
} from '@villedemontreal/auth-oidc-plugin-request';
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
const config: request.CoreOptions = {
  baseUrl: 'http://localhost:4004',
};
authenticator(session).bind(config);
request.get('/secured/profile', config, (err, res, body) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.statusCode, body);
  }
});
```

Note that the plugins will also work with 'request' promises such as 'request-promise-native' or similar.

Note that this plugin won't implement all features (such as retry or IHttpClient) since the 'request' module has been deprecated. We implemented the bare minimum to help integrate our lib with the https://openapi-generator.tech/docs/generators/typescript-node generator.

There are a couple of helper functions that make it easy to add OIDC authentication into the generated API classes:

```typescript
import {
  ILogger,
  IHttpRequestCorrelator,
} from '@villedemontreal/auth-core';
import {
  IOidcSession,
  authInterceptor,
  requestCorrelationInterceptor,
  requestLoggingInterceptor
} from '@villedemontreal/auth-oidc-plugin-request';
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

## Documentation

For more information about the configuration options, the flows and the object model, go to the [Documentation](doc) folder.

## Examples

For a real example, go to the [Examples](examples) folder.

## Developing

This project is a **monorepo**, that relies on [Lerna](https://lerna.js.org/) to simplify common tasks and take care of interdependencies.

### Unit testing

The project uses [Jest](https://jestjs.io/) for handling unit tests.

Running tests:

- From the command-line: `npm t`
- From VSCode: continuous testing with the [Jest extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)
- From the browser: using the [Majestic test runner](https://github.com/Raathigesh/majestic/)

Viewing code coverage:

```
npm t
npm run show-coverage
```

Debugging:

- make sure that the coverage feature is disabled while debugging otherwise you won't be able to hit your breakpoints.
- the project already contains the .vscode folder that exposes 2 debug tasks:
  - Jest current file
  - Jest all

### Code quality

Finally, the project is configured to enforce code quality using:

- https://eslint.org/
- https://prettier.io/
- https://commitlint.js.org/

All those quality gates are enforced through the use of Git commit hooks (provided by https://github.com/typicode/husky)

Note that you should install VSCode plugins to enforce those rules when saving files.
(The project already has the .vscode/settings.json file configured)

### Installation

`npm install`

Note that it will automatically install the modules of each project managed by this mono-repo, then it will compile all projects.

### Build

```
npm run compile
```

### Testing

Run unit tests:

`npm run test`

Run linter for Typescript and formatting (Prettier):

`npm run lint`

or

`npm run lint-fix`

## Releasing

### Develop branch

Publish the package as a beta release.

Note that it will patch the current version (but it won't alter the committed package.json file),
inject a beta tag and a Git sha.

Ex: @villedemontreal/auth-core@0.0.6-beta.1+55b3646

```
git checkout develop
npm run publish:dev
```

### Master branch

`git checkout develop`

Generate a new version in package.json, commit it and tag it (should be executed manually):
`npm run bump`
Note that the incremented version (patch) should now match the pre-incremented version of the develop branch.

Merge develop into master:

```
git checkout master
git merge develop --ff-only
```

Publish the package from the current git tag, created by the previous step (should be executed by the CI):
`npm run publish:master`

## License

The source code of this project is distributed under the [MIT License](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Code of Conduct

Participation in this poject is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## TODOs

- add more logs
- trigger more events
- implement UMA2
- implement SCIM
