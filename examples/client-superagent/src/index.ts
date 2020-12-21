import * as superagent from 'superagent';
import {
  delay,
  ConsoleLogger,
  HttpRequestCorrelator,
} from '@villemontreal/auth-core';
import {
  authenticator,
  requestLogger,
  requestCorrelator,
  createSession,
  IOidcClientConfig,
  IOidcSessionConfig,
  IOidcAuthenticatorConfig,
} from '@villemontreal/auth-oidc-plugin-superagent';

async function main(): Promise<void> {
  // configure
  const correlator = new HttpRequestCorrelator();
  const clientConfig: IOidcClientConfig = {
    authMethod: 'client_secret_basic',
    client: {
      id: 'client',
      secret: 'clientSecret',
    },
    issuer: 'http://localhost:5000',
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
      const req = superagent
        .get('http://localhost:4004/secured/profile')
        .use(requestLogger(session.logger))
        .use(requestCorrelator(correlator))
        .use(authenticator(session, authenticatorConfig));
      const res = await req;
      console.log('Response', res.status, res.body);
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
  });
