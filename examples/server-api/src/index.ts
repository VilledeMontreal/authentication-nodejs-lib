import express from 'express';
import {
  ConsoleLogger,
  HttpRequestCorrelator,
} from '@villedemontreal/auth-core';
import {
  createSession,
  createInspector,
  IOidcClientConfig,
  IOidcSessionConfig,
} from '@villedemontreal/auth-oidc';
import { HttpClientError } from '../../../packages/core/dist';

let requestCounter = 0;

// setup the OIDC configs
const correlator = new HttpRequestCorrelator();
const clientConfig: IOidcClientConfig = {
  authMethod: 'client_secret_basic',
  client: {
    id: 'inspector',
    secret: 'inspectorSecret',
  },
  issuer: 'http://localhost:5000',
  scopes: ['openid', 'profile'],
};
const sessionConfig: IOidcSessionConfig = {
  scheduleRefresh: true,
  factory: {
    createLogger: () => new ConsoleLogger(() => correlator.getId()),
  },
  httpDefaults: {
    correlator,
    logRequests: false,
  },
};

// create the session and the token inspector
const session = createSession(clientConfig, sessionConfig);
const inspector = createInspector(session, {
  introspectionEndpointAuthMethod: 'client_secret_basic',
});

// helper functions
function extractToken(header: string) {
  const [token_type, access_token] = (header || '').split(' ');
  return {
    token_type,
    access_token,
  };
}

// middlewares
function correlationMiddleware(correlator: HttpRequestCorrelator) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const cid = req.headers['x-correlation-id'] as string;
    correlator.withId(next, cid);
  };
}

// build the Express app
const app = express();

app.use(correlationMiddleware(correlator));

app.get('/hello', function (req, res) {
  res.send('World');
});

app.get('/secured/profile', async function (req, res, next) {
  requestCounter += 1;
  try {
    // if the request has no authorization, return a 401
    if (!req.headers.authorization) {
      res.sendStatus(401);
      return;
    }
    // get token
    const { access_token } = extractToken(req.headers.authorization);
    // Note that using the inspector like this is not optimal (no caching),
    // but we do it just for the demo.
    const tokenInfo = await inspector.getTokenInfo(access_token);
    // ensure token is active
    if (!tokenInfo.active) {
      console.log(
        `#${requestCounter}, token is inactive, client is "${tokenInfo.client_id}"`
      );
      res.sendStatus(401);
      return;
    }
    // calc remaining expiration
    const expDate = new Date((tokenInfo.exp || 0) * 1000);
    const expInSecs = (expDate.getTime() - new Date().getTime()) / 1000;
    console.log(
      `#${requestCounter}, token is active, client is "${tokenInfo.client_id}", expires in ${expInSecs} secs`
    );
    // simulate a bad token every 50 requests
    if (requestCounter % 50 === 0) {
      console.log(
        `#${requestCounter}, --------------------< force 401 error >----------------`
      );
      res.sendStatus(401);
      return;
    }
    // Send valid response
    res.json({ firstName: 'John', lastName: 'Doe' });
    // Done
  } catch (err) {
    // if we catch an error raised by the http client used by the inspector,
    // then assume that we could not validate the access token and return a 401
    if (err instanceof HttpClientError) {
      console.error(err.message);
      console.error(err.body);
      res.sendStatus(401);
    } else {
      // pass the error to the next middleware
      next(err);
    }
  }
});

// start the app server
app.listen(4004, () => {
  console.log(
    'server-api listening on port 4004, check http://localhost:4004/hello'
  );
});
