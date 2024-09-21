// import * as request from 'request';
import * as request from 'request-promise-native';
import {
  delay,
  ConsoleLogger,
  HttpRequestCorrelator,
} from '@villedemontreal/auth-core';
import {
  authenticator,
  requestLogger,
  requestCorrelator,
  createSession,
  IOidcClientConfig,
  IOidcSessionConfig,
  IOidcAuthenticatorConfig,
  patchClass,
} from '@villedemontreal/auth-oidc-plugin-request';

async function main(): Promise<void> {
  patchClass((request as any).Request); // this is required when using Lerna but should not otherwise
  // configure
  const correlator = new HttpRequestCorrelator();
  const clientConfig: IOidcClientConfig = {
    authMethod: 'client_secret_basic',
    client: {
      id: 'client',
      secret: 'clientSecret',
    },
    issuer: 'http://localhost:5005',
    scopes: ['openid', 'profile'],
    requestTimeout: 5000, // 5s timeout for OIDC requests (overrides global value)
  };
  const sessionConfig: IOidcSessionConfig = {
    scheduleRefresh: true,
    factory: {
      createLogger: () => new ConsoleLogger(() => correlator.getId()),
    },
    httpDefaults: {
      correlator,
      timeout: 10000, // 10s timeout for all requests
    },
  };
  const session = createSession(clientConfig, sessionConfig);
  const authenticatorConfig: IOidcAuthenticatorConfig = {
    retryUnauthenticatedRequests: true,
  };
  const options: any = {
    baseUrl: 'http://localhost:4004',
    resolveWithFullResponse: true,
    json: true,
    simple: false,
  };
  requestLogger(session.logger).bind(options);
  requestCorrelator(correlator).bind(options);
  authenticator(session, authenticatorConfig).bind(options);
  // execute
  for (let i = 0; i < 100; i++) {
    await correlator.withIdAsync(async () => {
      console.log(
        '-----------------------------------------------------------------------'
      );
      console.log(`--- request #${i + 1}`);
      console.log(
        '-----------------------------------------------------------------------'
      );
      // using a promise
      const res = await request.get('/secured/profile', options);
      console.log('Response', res.statusCode, res.body);
      // using vanilla module and a callback
      // request.get('/secured/profile', options, (err, res, body) => {
      //   if(err) {
      //     console.error(err);
      //   } else {
      //     console.log('Response', res.statusCode, res.body);
      //   }
      // });
      await delay(1000);
    }, `CLIENT-${i + 1}`);
  }
}

main()
  .then(() => {
    console.log(
      '-----------------------------------------------------------------------'
    );
    console.log('--- done');
    console.log(
      '-----------------------------------------------------------------------'
    );
  })
  .catch((reason) => {
    console.error(reason.message);
    if (reason.body) {
      console.error(reason.body);
    }
    if (reason.data) {
      console.error(reason.data);
    }
  });
