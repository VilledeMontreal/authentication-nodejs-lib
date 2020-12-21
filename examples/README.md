# Examples

In the examples folder, you will find:

- an OIDC server that will produce the access tokens (using the [oidc-provider](https://www.npmjs.com/package/oidc-provider) npm project)
- an API server that can receive access tokens and validate them against the OIDC server (using the OidcTokenInspector)
- a test client for each supported Http client, that will authenticate against the OIDC server and send authenticated requests to the API server.

Note that the token expiration has been set to 30 seconds, but the OIDC session will eagerly refresh the token every 20 seconds.

Finally, the API server will force a 401 error every 50 requests in order to test that the session is able to detect the error, get a new token and retry the request.

The test client will issue 100 requests, with a one second delay, that will last 1 minute 40 seconds.

## install

```
git clone https://github.com/VilledeMontreal/authentication-nodejs-lib.git
cd authentication-nodejs-lib
npm install
```

## run

Open 3 terminals.

### In the first terminal:

```
cd examples/server-oidc
npm start
```

### In the second terminal:

```
cd examples/server-api
npm start
```

### In the third terminal:

Select the http client you want to try. We support:

- internal (our client)
- superagent
- axios
- got
- request (note that retries are not supported)

Go the client-\* folder matching the required client and execute a "npm start" command.

```
cd examples/client-internal
npm start
```

or

```
cd examples/client-superagent
npm start
```

or

```
cd examples/client-axios
npm start
```

or

```
cd examples/client-request
npm start
```

### Observe

Observe the requests and the periodic token renewal.
