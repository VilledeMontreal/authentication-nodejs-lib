/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  Cache,
  combinePath,
  IHttpClient,
  IHttpRequest,
  ILogger,
  ITimeProvider,
  SynchronizedAsyncCachedValue,
} from '@villedemontreal/auth-core';
import { IOidcServerConfig } from './IOidcServerConfig';
import { IOidcServerConfigProvider } from './IOidcServerConfigProvider';

/**
 * Provider of an IOidcServerConfig using the discovery endpoint
 * of the OIDC server (.wellknown/openid-configuration)
 */
export class OidcWellknownServerConfigProvider
  implements IOidcServerConfigProvider
{
  private readonly cache: Cache<
    SynchronizedAsyncCachedValue<IOidcServerConfig>
  >;

  /**
   * creates a new instance of a OidcWellknownServerConfigProvider
   * @param logger the logger
   * @param httpClient the HTTP client
   * @param timeProvider the time provider
   * @param requestTimout the timeout for discovery endpoint
   */
  constructor(
    private readonly logger: ILogger,
    private readonly httpClient: IHttpClient,
    timeProvider: ITimeProvider,
    private readonly requestTimout?: number,
  ) {
    this.cache = new Cache<SynchronizedAsyncCachedValue<IOidcServerConfig>>(
      timeProvider,
    );
  }

  /**
   * Fetches the discovery document from the specified server.
   * Note that if you only specify the hostname (https://my.auth.server.com)
   * without adding ".well-known" in the url, then the provider
   * will automatically append the ".wellknown/openid-configuration" endpoint.
   * @param server the hostname of your OIDC server
   */
  public async getConfig(server: string): Promise<IOidcServerConfig> {
    if (!server) {
      throw new Error('server is a required parameter');
    }
    let config = this.cache.get(server);
    if (!config) {
      let url = server;
      if (url.indexOf('.well-known') < 0) {
        url = combinePath(url, '.well-known/openid-configuration');
      }
      this.logger.debug(
        { server, url },
        `fetching OIDC config of server ${server}`,
      );
      config = new SynchronizedAsyncCachedValue<IOidcServerConfig>(
        async previous => {
          const req: IHttpRequest = {
            url,
            headers: {
              accept: 'application/json',
            },
            timeout: this.requestTimout,
          };
          const resp = await this.httpClient.send(req);
          const body = this.processServerConfig(resp.body);
          return body as IOidcServerConfig;
        },
      );
      this.cache.set(server, config, 60 * 60); // for 1h
    }
    return config.getValue();
  }

  /**
   * hook for customizing the returned OIDC well-known config returned by the discovery endpoint.
   * @param config the well-known OIDC config to process
   */
  protected processServerConfig(config: any): any {
    return config;
  }
}
