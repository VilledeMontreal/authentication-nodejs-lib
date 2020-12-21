/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  IHttpClient,
  ILogger,
  SynchronizedAsyncValue,
} from '@villemontreal/auth-core';
import { EventEmitter } from 'events';
import { ITokenProvider } from '../tokens/ITokenProvider';
import { ITokenStore } from '../tokens/ITokenStore';
import { TokenSet } from '../tokens/TokenSet';
import { IOidcClientConfig } from './IOidcClientConfig';
import { IOidcServerConfig } from './IOidcServerConfig';
import { IOidcServerConfigGetter } from './IOidcServerConfigGetter';
import { IOidcSession } from './IOidcSession';
import { IOidcSessionConfig } from './IOidcSessionConfig';
import { OidcSessionState } from './OidcSessionState';

/**
 * The OIDC session that can provide an access token required to authenticate
 * API calls.
 * You can also subscribe to events triggered by the session when its state changes
 * or when a new token has been acquired.
 */
export class OidcSession extends EventEmitter implements IOidcSession {
  private readonly tokenAccessor: SynchronizedAsyncValue<TokenSet>;

  private state: OidcSessionState = OidcSessionState.uninitialized;

  /* eslint-disable-next-line no-undef */
  private timer?: NodeJS.Timeout;

  private getTokenCounter = 0;

  /**
   * creates a new instance of an OidcSession
   * @param logger the logger
   * @param httpClient the HTTP client
   * @param tokenStore the token store
   * @param tokenProvider the token provider
   * @param serverConfigGetter the server config provider
   * @param clientConfig the client config
   * @param sessionConfig the session config
   */
  constructor(
    public readonly logger: ILogger,
    public readonly httpClient: IHttpClient,
    private readonly tokenStore: ITokenStore,
    private readonly tokenProvider: ITokenProvider,
    private readonly serverConfigGetter: IOidcServerConfigGetter,
    public readonly clientConfig: Readonly<IOidcClientConfig>,
    public readonly sessionConfig: Readonly<IOidcSessionConfig>,
  ) {
    super();
    this.tokenAccessor = new SynchronizedAsyncValue<TokenSet>({
      getter: () => this.tokenGetter(),
      setter: value => this.tokenSetter(value),
      resolver: previousValue => this.refreshToken(previousValue),
      validator: value => this.tokenValidator(value),
    });
  }

  /**
   * gets the OIDC server config used to discover the token endpoint
   */
  public getServerConfig(): Promise<Readonly<IOidcServerConfig>> {
    return this.serverConfigGetter.getConfig();
  }

  /**
   * gets the current state of the session
   */
  public async getState(): Promise<OidcSessionState> {
    if (this.state === OidcSessionState.tokenAcquired) {
      const token = await this.tokenStore.get();
      if (token && token.hasExpired()) {
        return Promise.resolve(OidcSessionState.tokenExpired);
      }
    }
    return Promise.resolve(this.state);
  }

  /**
   * deletes the submitted token from the token store.
   * Note that nothing will happen if the token does not exist.
   * @param token the token to delete
   */
  public async deleteToken(token: TokenSet): Promise<void> {
    await this.tokenStore.delete(token);
  }

  /**
   * tells if there is already a current token (which might be expired)
   */
  public async hasToken(): Promise<boolean> {
    return !!(await this.tokenStore.get());
  }

  /**
   * forces a refresh of the current token.
   */
  public async forceRefreshToken(): Promise<TokenSet> {
    return this.tokenAccessor.getValue(true);
  }

  /**
   * gets the current token.
   * if there is no token or if the token has expired, it will acquire a new one.
   */
  public async getToken(): Promise<TokenSet> {
    return this.tokenAccessor.getValue(false);
  }

  private async refreshToken(token?: TokenSet): Promise<TokenSet> {
    this.clearTimer();
    try {
      if (
        token &&
        token.refresh_token &&
        this.sessionConfig.canUseRefreshTokens
      ) {
        const newToken = await this.tryRefreshToken(token, token.refresh_token);
        if (newToken) {
          return newToken;
        }
      }
      return await this.doGetToken();
    } catch (e) {
      this.setState(OidcSessionState.error);
      this.logger.error(e, 'Could not get token');
      throw e;
    }
  }

  private async tryRefreshToken(
    token: TokenSet,
    refreshToken: string,
  ): Promise<TokenSet | undefined> {
    try {
      this.setState(OidcSessionState.refreshingToken);
      const refreshedToken = await this.tokenProvider.refreshToken(
        refreshToken,
      );
      this.setState(OidcSessionState.tokenAcquired);
      return refreshedToken;
    } catch (e) {
      this.logger.error(e, 'Could not refresh token');
      await this.tokenStore.delete(token);
    }
    return undefined;
  }

  private async doGetToken(): Promise<TokenSet> {
    this.setState(OidcSessionState.acquiringToken);
    const newToken = await this.tokenProvider.getToken();
    this.setState(OidcSessionState.tokenAcquired);
    return newToken;
  }

  private setState(value: OidcSessionState) {
    this.state = value;
    this.emit('stateChanged', value);
  }

  private tokenGetter(): Promise<TokenSet | undefined> {
    this.getTokenCounter += 1;
    return this.tokenStore.get();
  }

  private async tokenSetter(value: TokenSet): Promise<void> {
    this.getTokenCounter = 0;
    await this.tokenStore.add(value);
    if (this.sessionConfig.scheduleRefresh) {
      this.scheduleRefresh(value);
    }
    this.emit('token', value);
  }

  private tokenValidator(value: TokenSet): boolean {
    return !value.hasExpired();
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private scheduleRefresh(token: TokenSet) {
    const secs = Math.max(1, token.expires_in - token.expirationOffset * 2);
    this.logger.debug(
      {
        currentToken: token.toRedactedJSON(),
        delayInSecs: secs,
      },
      `scheduling a refresh of the token in ${secs} secs`,
    );
    this.clearTimer();
    const correlator = this.sessionConfig.httpDefaults?.correlator;
    if (correlator) {
      // Note that we must start a new correlation context in order to
      // wrap the operations required to refresh the token with a separate
      // correlation ID and avoid mixing them with the current transaction.
      correlator.withId(() => {
        this.startTimer(token, secs);
      });
    } else {
      this.startTimer(token, secs);
    }
  }

  private startTimer(token: TokenSet, secs: number) {
    this.timer = setTimeout(async () => {
      try {
        // force refresh only if the token was used at least once during the elapsed period.
        if (this.getTokenCounter > 0) {
          this.logger.debug(
            {
              currentToken: token.toRedactedJSON(),
            },
            'initiating the scheduled refresh of the current token',
          );
          await this.forceRefreshToken();
        }
      } catch (e) {
        this.logger.error(e, 'Could not refresh token from timer');
      }
      // tslint:disable-next-line: align
    }, secs * 1000);
    // Note that calling unref() will allow the process to exit without
    // blocking on the scheduled timeout.
    this.timer.unref();
  }
}
