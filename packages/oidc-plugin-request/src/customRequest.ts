/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import * as request from 'request';
import { IRequestPluginImplementation } from './IRequestPluginImplementation';

/* eslint-disable no-underscore-dangle */

// Note that we need to inject an asynchronous step before executing the request
// and we need to inspect the outcome of the request, since we must invalidate
// the access token if the request was not authorized (401).
// The strategy is to override the submitted callback and also
// the triggering event which is any call to the methods end, write or pipe.
// If such a method is called, we will start invoking our plugins asynchronously,
// then we will let the orignal method proceed which will ultimately invoke
// the callback (that we intercept).
// Note that we can have the methods 'write' and 'end' invoked in sequence and
// thus we must wait for the first one (write) to complete before letting the other one (end)
// continue.

const kHooked = Symbol('hooked');

// Note that we can't use a symbol for properties that need to be copied
// by the request module.
const kPlugins = '_plugins';

export function catchErrors(action: () => void) {
  try {
    action();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unexpected error:', err);
  }
}

export function getPlugins(instance: any): IRequestPluginImplementation[] {
  return instance[kPlugins] || [];
}

export function addPlugins(
  instance: any,
  plugins: IRequestPluginImplementation[],
) {
  let currentPlugins: IRequestPluginImplementation[] = instance[kPlugins];
  if (!currentPlugins) {
    currentPlugins = [];
    // eslint-disable-next-line no-param-reassign
    instance[kPlugins] = currentPlugins;
  }
  currentPlugins.push(...plugins);
}

async function onStart(req: request.Request): Promise<void> {
  for (const plugin of getPlugins(req)) {
    await plugin.onStart?.(req);
  }
}

function onCallback(
  this: request.Request,
  oldCallback: request.RequestCallback,
  err: any,
  res: request.Response,
  body: any,
): void {
  let beforeCallback: Promise<void>;
  if (err) {
    beforeCallback = onError.call(this, err);
  } else {
    beforeCallback = onComplete.call(this, res, body);
  }
  beforeCallback
    .catch(beforeCallbackErr => {
      catchErrors(() => {
        if (err) {
          // eslint-disable-next-line no-param-reassign
          beforeCallbackErr.innerError = err;
        }
        oldCallback(beforeCallbackErr, res, body);
      });
    })
    .then(() => {
      catchErrors(() => {
        oldCallback(err, res, body);
      });
    });
}

async function onComplete(
  this: request.Request,
  res: request.Response,
  body?: string | Buffer,
): Promise<void> {
  for (const plugin of getPlugins(this)) {
    await plugin.onComplete?.(this, res, body as undefined);
  }
}

async function onError(this: request.Request, error: Error) {
  for (const plugin of getPlugins(this)) {
    await plugin.onError?.(error, this);
  }
}

export function overrideMethod(prototype: any, name: string) {
  const oldMethod = prototype[name];
  if (!oldMethod) {
    throw new Error(`Could not find method '${name}' in Request class`);
  }

  return function wrapper(this: request.Request, ...args: any[]) {
    let startPromise = (this as any)._start;
    if (!startPromise) {
      // start only once
      startPromise = onStart(this);
      (this as any)._start = startPromise;
    }
    startPromise
      .then(() => {
        // continue with the real method (end, write, pipe...)
        oldMethod.call(this, ...args);
      })
      .catch((err: any) => {
        this.emit('error', err);
      })
      .finally(() => {
        delete (this as any)._start;
      });
  };
}

export function customInit(this: request.Request, options: any) {
  (this as any).oldInit(options);
  const internalCallback = (this as any)._callback;
  if (!internalCallback[kHooked]) {
    const newCallback: any = onCallback.bind(this, internalCallback);
    newCallback[kHooked] = true;
    (this as any)._callback = newCallback;
  }
}

export function patchClass(constr: any) {
  const proto = constr.prototype;

  if (!proto.oldInit) {
    proto.oldInit = proto.init;
    proto.init = customInit;

    proto.end = overrideMethod(proto, 'end');
    proto.write = overrideMethod(proto, 'write');
    proto.pipe = overrideMethod(proto, 'pipe');
  }
}

patchClass((request as any).Request);
