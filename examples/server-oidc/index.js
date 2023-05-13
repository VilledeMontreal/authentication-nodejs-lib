import Provider from 'oidc-provider';

const accounts = {
  foo: {
    sub: 'client',
    email: 'client@bar.com',
    email_verified: true,
    given_name: 'John',
    family_name: 'Doe',
    name: 'John Doe',
    locale: 'en-US',
  },
};

const configuration = {
  // ... see available options /docs
  features: {
    introspection: { enabled: true },
    revocation: { enabled: true },
    clientCredentials: { enabled: true },
  },
  findAccount: (ctx, id, token) => {
    console.log('find account', id, token);
    return Promise.resolve(accounts[id]);
  },
  ttl: {
    ClientCredentials: 30,
  },
  clients: [
    {
      client_id: 'client',
      client_secret: 'clientSecret',
      redirect_uris: ['http://localhost/callback'],
      response_types: [],
      grant_types: ['client_credentials'],
    },
    {
      client_id: 'inspector',
      client_secret: 'inspectorSecret',
      redirect_uris: [],
      response_types: [],
      grant_types: ['client_credentials'],
      tokenEndpointAuthMethods: 'none',
    },
  ],
};

const oidc = new Provider('http://localhost:5000', configuration);

// or just expose a server standalone, see /examples/standalone.js
const server = oidc.listen(5000, () => {
  console.log(
    'oidc-provider listening on port 5000, check http://localhost:5000/.well-known/openid-configuration'
  );
});
