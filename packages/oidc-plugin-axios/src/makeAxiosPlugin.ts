/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import axios, {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosInstance,
  AxiosError,
} from 'axios';
import {
  retryAction,
  isTransientHttpError,
  TypedProperty,
} from '@villedemontreal/auth-core';
import { IAxiosPlugin } from './IAxiosPlugin';
import { IAxiosPluginImplementation } from './IAxiosPluginImplementation';

const contextProperty = new TypedProperty<
  IAxiosPluginContext,
  AxiosInstance | AxiosRequestConfig
>(Symbol('PluginContext'));

/**
 * The plugin context used while processing a request.
 */
export interface IAxiosPluginContext {
  target: AxiosInstance | AxiosRequestConfig;
  plugins: IAxiosPluginImplementation[];
  oldAdapter: AxiosAdapter;
  newAdapter: AxiosAdapter;
  retries?: number;
}

/**
 * Builds a new plugin from its implementation.
 * @param implementation the plugin callbacks
 * @returns the returned plugin can be bound to an AxiosRequestConfig
 * or a new Axios instance.
 */
export function makeAxiosPlugin(
  implementation: IAxiosPluginImplementation,
): IAxiosPlugin {
  return {
    bind(target) {
      const obj: any = target;
      if (obj.defaults?.adapter && !obj.adapter) {
        obj.defaults.adapter = adapt(target, obj.defaults.adapter);
      } else {
        obj.adapter = adapt(target, obj.adapter || axios.defaults.adapter);
      }
    },
  };

  function adapt(
    target: AxiosInstance | AxiosRequestConfig,
    oldAdapter: AxiosAdapter,
  ): AxiosAdapter {
    const ctx = contextProperty.getOrSet(target, () => {
      const newCtx = {
        target,
        plugins: [],
        oldAdapter,
        newAdapter: oldAdapter,
      };
      newCtx.newAdapter = requestAdapter(newCtx);
      return newCtx;
    });
    ctx.plugins.push(implementation);
    ctx.retries = Math.max(ctx.retries || 0, implementation.retries || 0);
    return ctx.newAdapter;
  }

  function requestAdapter(ctx: IAxiosPluginContext) {
    return async (config: AxiosRequestConfig) => {
      return retryAction({
        maxRetries: ctx.retries || 0,
        action: (attempt, lastError) => {
          return executeRequest(ctx, config);
        },
        canRetry: (attempt, error) => {
          const canRetryPoll = pluginErrorPoll(ctx, config, error);
          if (canRetryPoll !== undefined) {
            return Promise.resolve(canRetryPoll);
          }
          return Promise.resolve(
            isTransientHttpError(error.response?.status, error.code),
          );
        },
      });
    };
  }
}

async function executeRequest(
  ctx: IAxiosPluginContext,
  config: AxiosRequestConfig,
) {
  for (const plugin of ctx.plugins) {
    await plugin.onStart?.(config);
  }
  try {
    const response = await ctx.oldAdapter(config);
    for (const plugin of ctx.plugins) {
      await plugin.onSuccess?.(config, response);
    }
    return response;
  } catch (err) {
    for (const plugin of ctx.plugins) {
      await plugin.onError?.(config, err);
    }
    throw err;
  }
}

/**
 * lets plugin vote to decide if we can retry the request or not
 * @param ctx the context
 * @param config the config
 * @param error the error to evaluate
 * @returns true if at least one plugin votes for a retry,
 * false if at least one plugin vote against and no plugin votes for.
 * Finally, it will return undefined if no plugin casts a vote.
 */
export function pluginErrorPoll(
  ctx: IAxiosPluginContext,
  config: AxiosRequestConfig,
  error: AxiosError,
): boolean | undefined {
  let canRetryPoll: boolean | undefined;
  for (const plugin of ctx.plugins) {
    const canRetryVote = plugin.canRetry?.(config, error);
    if (canRetryVote !== undefined) {
      if (canRetryPoll === undefined) {
        canRetryPoll = canRetryVote;
      } else if (canRetryVote) {
        canRetryPoll = true;
      }
    }
  }
  return canRetryPoll;
}
