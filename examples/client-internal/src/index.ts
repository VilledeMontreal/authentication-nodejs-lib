import {
  delay,
  ConsoleLogger,
  HttpRequestCorrelator,
} from '@villedemontreal/auth-core';
import {
  createSession,
  OidcHttpClient,
  IOidcClientConfig,
  IOidcSessionConfig,
  IOidcAuthenticatorConfig,
} from '@villedemontreal/auth-oidc';

async function main(): Promise<void> {
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
      timeout: 10000, // 10s timeout for all requests
      correlator,
    },
  };
  const session = createSession(clientConfig, sessionConfig);
  const authenticatorConfig: IOidcAuthenticatorConfig = {
    retryUnauthenticatedRequests: true,
  };
  // create http client
  const httpClient = new OidcHttpClient(
    session.httpClient,
    session,
    authenticatorConfig
  );
  // execute
  for (let i = 0; i < 100; i++) {
    console.log(
      '-----------------------------------------------------------------------'
    );
    console.log(`--- request #${i + 1}`);
    console.log(
      '-----------------------------------------------------------------------'
    );
    await correlator.withIdAsync(async () => {
      const res = await httpClient.send({
        url: 'http://localhost:4004/secured/profile',
      });
      console.log('Response', res.statusCode, res.body);
    }, `CLIENT-${i + 1}`);
    await delay(1000);
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
