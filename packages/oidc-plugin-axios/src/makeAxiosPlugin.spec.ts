/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { FakeLogger } from '@villedemontreal/auth-core';
import axios, {
  AxiosAdapter,
  AxiosResponse,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from 'axios';
import { pluginErrorPoll, IAxiosPluginContext } from './makeAxiosPlugin';
import { requestLogger } from './requestLogger';

describe('makeAxiosPlugin', () => {
  test('no plugin should not produce a valid vote', () => {
    const { config, ctx, error } = createContext();
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(undefined);
  });

  test('plugins without canRetry should not produce a valid vote', () => {
    const { config, ctx, error } = createContext();
    ctx.plugins.push({}, {});
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(undefined);
  });

  test('plugins not voting should not produce a valid vote', () => {
    const { config, ctx, error } = createContext();
    ctx.plugins.push({
      canRetry() {
        return undefined;
      },
    });
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(undefined);
  });

  test('a single voting true plugin should force the vote', () => {
    const { config, ctx, error } = createContext();
    ctx.plugins.push({
      canRetry() {
        return true;
      },
    });
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(true);
  });

  test('a single voting false plugin should force the vote', () => {
    const { config, ctx, error } = createContext();
    ctx.plugins.push({
      canRetry() {
        return false;
      },
    });
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(false);
  });

  test('if at least one plugin votes true, it should force the vote', () => {
    const { config, ctx, error } = createContext();
    ctx.plugins.push({
      canRetry() {
        return undefined;
      },
    });
    ctx.plugins.push({
      canRetry() {
        return false;
      },
    });
    ctx.plugins.push({
      canRetry() {
        return true;
      },
    });
    ctx.plugins.push({
      canRetry() {
        return false;
      },
    });
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(true);
  });

  test('if no plugin votes true and one plugin votes false, it should force the vote', () => {
    const { config, ctx, error } = createContext();
    ctx.plugins.push({
      canRetry() {
        return undefined;
      },
    });
    ctx.plugins.push({
      canRetry() {
        return false;
      },
    });
    ctx.plugins.push({
      canRetry() {
        return undefined;
      },
    });
    const poll = pluginErrorPoll(ctx, config, error);
    expect(poll).toBe(false);
  });

  test('should call old adapter if it is a function', async () => {
    const fakeConfig: InternalAxiosRequestConfig = {
      headers: AxiosHeaders.from({}),
    };
    const fakeResp: AxiosResponse = {
      config: fakeConfig,
      data: '',
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
    };
    const config: AxiosRequestConfig = {
      adapter: () => Promise.resolve(fakeResp),
    };
    const logger = new FakeLogger();
    requestLogger(logger).bind(config);

    const res = await axios.get('http://localhost:1234', config);
    expect(res).toBe(fakeResp);
  });

  test('should call old adapter if it is a function in defaults', async () => {
    const fakeConfig: InternalAxiosRequestConfig = {
      headers: AxiosHeaders.from({}),
    };
    const fakeResp: AxiosResponse = {
      config: fakeConfig,
      data: '',
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
    };
    const agent = axios.create({
      adapter: () => Promise.resolve(fakeResp),
    });
    const config: AxiosRequestConfig = {};
    const logger = new FakeLogger();
    requestLogger(logger).bind(agent);

    const res = await agent.get('http://localhost:1234', config);
    expect(res).toBe(fakeResp);
  });

  function createContext() {
    const config: InternalAxiosRequestConfig = {
      headers: AxiosHeaders.from({}),
    };
    const resp: AxiosResponse = {
      config,
      data: '',
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
    };
    const adapter: AxiosAdapter = () => Promise.resolve(resp);
    const ctx: IAxiosPluginContext = {
      target: config,
      plugins: [],
      oldAdapter: adapter,
      newAdapter: adapter,
    };
    const error = new Error('Internal Server Error') as AxiosError;
    error.response = resp;
    return {
      config,
      ctx,
      error,
    };
  }
});
